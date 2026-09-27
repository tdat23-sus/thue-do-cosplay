/* =========================================================
   CHIYOO SHOP - SCRIPT.JS
   - Supabase Auth
   - Characters
   - Rental calendar from real rentals table
   - Realtime rental updates
   - Double availability check before INSERT
   - Shows actual created_at time for rented days
   - Enforces a 7-day minimum gap between rental slots
   - Locks 6 days before/after an existing rental as preparation
========================================================= */

const SUPABASE_URL =
    "https://rydkgmtlmhjftbwukzdn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_wIOEpyFJLjH_aWSwnUIF-g_WCvEUOot";

if (!window.supabase) {
    throw new Error(
        "Supabase JS chưa được tải. Hãy kiểm tra script CDN trong index.html."
    );
}

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let currentProfile = null;
let authMode = "login";
let pendingBookingDay = null;
let selectedBookingDay = null;
let selectedCharacter = null;
let characters = [];

const now = new Date();
let currentMonth = now.getMonth();
let currentYear = now.getFullYear();

let rentalRealtimeChannel = null;

/* =========================================================
   RENTAL GAP / PREPARATION TIME
   - Hai lần thuê của cùng một nhân vật phải cách nhau ít nhất 7 ngày.
   - Nếu thuê ngày D, D+1 đến D+6 sẽ bị khóa.
   - Đồng thời D-1 đến D-6 cũng bị khóa để tránh đặt quá sát.
   - D+7 là ngày kế tiếp có thể nhận slot.
========================================================= */
const MIN_RENTAL_GAP_DAYS = 7;
const COOLDOWN_DAYS = MIN_RENTAL_GAP_DAYS - 1;


/* =========================================================
   DOM
========================================================= */

const characterList =
    document.getElementById("character-list");

const characterCount =
    document.getElementById("character-count");

const homePage =
    document.getElementById("home-page");

const characterPage =
    document.getElementById("character-page");


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function makeDateString(year, monthIndex, day) {
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}


function parseLocalDate(value) {
    if (!value) return null;

    const parts =
        String(value)
            .slice(0, 10)
            .split("-")
            .map(Number);

    if (
        parts.length !== 3 ||
        parts.some(Number.isNaN)
    ) {
        return null;
    }

    return new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
    );
}


function addDaysToDateString(value, amount) {
    const date = parseLocalDate(value);

    if (!date) return null;

    date.setDate(date.getDate() + amount);
    return formatLocalDate(date);
}


function dateRangesOverlap(
    startA,
    endA,
    startB,
    endB
) {
    return startA <= endB && endA >= startB;
}


function formatRentalTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit"
    });
}


/* Những trạng thái này không còn giữ ngày. */
function rentalBlocksDate(status) {
    if (!status) return true;

    return ![
        "cancelled",
        "canceled",
        "rejected",
        "declined",
        "completed",
        "returned"
    ].includes(
        String(status).toLowerCase()
    );
}


function showToast(message) {
    const toast =
        document.getElementById("toast");

    if (!toast) {
        console.log("TOAST:", message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


/* =========================================================
   BOOKING CONTACT FIELDS
   - Email tài khoản không được dùng làm kênh liên hệ trong form.
   - Cách liên hệ được lưu trong customer_note để không
     phụ thuộc vào việc bảng rentals đã có cột riêng hay chưa.
========================================================= */

function ensureBookingContactFields() {
    const form =
        document.querySelector(
            '#booking-modal form'
        );

    if (!form) return;

    if (!document.getElementById('customer-contact-method')) {
        const wrapper = document.createElement('label');
        wrapper.id = 'customer-contact-method-wrapper';
        wrapper.innerHTML = `
            Cách liên hệ
            <select id="customer-contact-method">
                <option value="Zalo/Số điện thoại">Zalo/Số điện thoại</option>
                <option value="Facebook">Facebook</option>
            </select>
        `;

        const phoneInput =
            document.getElementById('customer-phone');

        if (phoneInput?.parentElement) {
            phoneInput.parentElement.before(wrapper);
        } else {
            form.appendChild(wrapper);
        }
    }

    const method =
        document.getElementById('customer-contact-method');

    const contactLabel =
        document.getElementById('customer-contact-label');

    const contactInput =
        document.getElementById('customer-phone');

    if (method && !method.dataset.bound) {
        method.addEventListener('change', updateContactFieldUI);
        method.dataset.bound = '1';
    }

    updateContactFieldUI();

    if (!document.getElementById('booking-contact-help')) {
        const help = document.createElement('p');
        help.id = 'booking-contact-help';
        help.className = 'booking-help';
        help.textContent =
            'Đây là yêu cầu đặt lịch, chưa phải xác nhận thuê. Shop sẽ nhận thông báo qua email và liên hệ bạn để trao đổi và chốt đơn.';

        const button =
            form.querySelector('button[type="submit"]');

        if (button) {
            button.before(help);
        } else {
            form.appendChild(help);
        }
    }
}

function updateContactFieldUI() {
    const method =
        document.getElementById('customer-contact-method')?.value ||
        'Zalo/Số điện thoại';

    const label =
        document.getElementById('customer-contact-label');

    const input =
        document.getElementById('customer-phone');

    if (!input) return;

    const isFacebook =
        method === 'Facebook';

    if (label) {
        label.textContent =
            isFacebook
                ? 'Link Facebook cá nhân'
                : 'Zalo / Số điện thoại';
    }

    input.type =
        isFacebook
            ? 'url'
            : 'tel';

    input.placeholder =
        isFacebook
            ? 'https://facebook.com/ten-cua-ban'
            : '09xxxxxxxx';

    input.autocomplete =
        isFacebook
            ? 'url'
            : 'tel';
}

/* =========================================================
   AUTH MODAL
========================================================= */

function openAuthModal(message = "") {
    const modal =
        document.getElementById("auth-modal");

    if (!modal) return;

    const messageElement =
        document.getElementById("auth-message");

    if (messageElement) {
        messageElement.textContent = message;
    }

    modal.classList.remove("hidden");
    setAuthMode(authMode);

    setTimeout(() => {
        document
            .getElementById("auth-email")
            ?.focus();
    }, 50);
}


function closeAuthModal() {
    document
        .getElementById("auth-modal")
        ?.classList.add("hidden");
}


function toggleAuthMode() {
    setAuthMode(
        authMode === "login"
            ? "register"
            : "login"
    );
}


function setAuthMode(mode) {
    authMode = mode;

    const isRegister =
        mode === "register";

    const title =
        document.getElementById("auth-title");

    if (title) {
        title.textContent =
            isRegister
                ? "Tạo tài khoản"
                : "Đăng nhập";
    }

    const submit =
        document.getElementById("auth-submit");

    if (submit) {
        submit.textContent =
            isRegister
                ? "Đăng ký"
                : "Đăng nhập";
    }

    const nameLabel =
        document.getElementById("auth-name-label");

    if (nameLabel) {
        nameLabel.classList.toggle(
            "hidden",
            !isRegister
        );
    }

    const switchText =
        document.getElementById("auth-switch-text");

    if (switchText) {
        switchText.textContent =
            isRegister
                ? "Đã có tài khoản?"
                : "Chưa có tài khoản?";
    }

    const switchButton =
        document.getElementById("auth-switch");

    if (switchButton) {
        switchButton.textContent =
            isRegister
                ? "Đăng nhập"
                : "Đăng ký";
    }
}


function translateAuthError(message) {
    if (!message) {
        return "Có lỗi xảy ra.";
    }

    if (
        message.includes("Invalid login credentials")
    ) {
        return "Email hoặc mật khẩu không đúng.";
    }

    if (
        message.includes("User already registered")
    ) {
        return "Email này đã được đăng ký.";
    }

    if (
        message.includes("Password should be at least")
    ) {
        return "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (
        message.includes("Email not confirmed")
    ) {
        return "Email chưa được xác nhận.";
    }

    if (
        message.includes("Email rate limit exceeded")
    ) {
        return "Bạn đã gửi quá nhiều yêu cầu email. Vui lòng thử lại sau.";
    }

    return message;
}


async function handleAuthSubmit(event) {
    event.preventDefault();

    const emailInput =
        document.getElementById("auth-email");

    const passwordInput =
        document.getElementById("auth-password");

    const nameInput =
        document.getElementById("auth-name");

    const submitButton =
        document.getElementById("auth-submit");

    const messageElement =
        document.getElementById("auth-message");

    const email =
        emailInput?.value.trim() || "";

    const password =
        passwordInput?.value || "";

    const name =
        nameInput?.value.trim() || "";

    if (!email || !password) {
        if (messageElement) {
            messageElement.textContent =
                "Vui lòng nhập email và mật khẩu.";
        }
        return;
    }

    if (
        authMode === "register" &&
        !name
    ) {
        if (messageElement) {
            messageElement.textContent =
                "Vui lòng nhập họ và tên.";
        }
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Đang xử lý...";
    }

    if (messageElement) {
        messageElement.textContent = "";
    }

    try {
        if (authMode === "register") {

            const {
                data,
                error
            } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });

            if (error) throw error;

            if (data?.session) {
                closeAuthModal();
                showToast("Tạo tài khoản thành công!");
            } else {
                if (messageElement) {
                    messageElement.textContent =
                        "Đăng ký thành công. Hãy kiểm tra email nếu Supabase yêu cầu xác nhận.";
                }
            }

        } else {

            const {
                data,
                error
            } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            currentUser =
                data?.user ||
                data?.session?.user ||
                null;

            await loadCurrentProfile(currentUser);

            closeAuthModal();
            showToast("Đăng nhập thành công!");

            pendingBookingDay = null;
        }

    } catch (error) {
        console.error("AUTH ERROR:", error);

        if (messageElement) {
            messageElement.textContent =
                translateAuthError(error?.message);
        }

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                authMode === "register"
                    ? "Đăng ký"
                    : "Đăng nhập";
        }
    }
}


async function signOutUser() {
    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error("SIGN OUT ERROR:", error);
        showToast("Không thể đăng xuất.");
        return;
    }

    currentUser = null;
    currentProfile = null;

    document
        .getElementById("my-bookings-modal")
        ?.classList.add("hidden");

    document
        .getElementById("my-bookings-button")
        ?.remove();

    updateAuthUI();
    showToast("Đã đăng xuất.");
}


async function loadCurrentProfile(user) {
    currentUser = user || null;
    currentProfile = null;

    if (!currentUser) {
        updateAuthUI();
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select(
            "id, full_name, phone, avatar_url, role"
        )
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.warn("PROFILE ERROR:", error);
    } else {
        currentProfile = data;
    }

    updateAuthUI();
}


function updateAuthUI() {
    const button =
        document.getElementById("auth-button");

    const userBox =
        document.getElementById("auth-user");

    const name =
        document.getElementById("auth-user-name");

    const role =
        document.getElementById("auth-user-role");

    const adminButton =
        document.getElementById("admin-button");

    if (!currentUser) {
        if (button) button.style.display = "inline-block";
        if (userBox) userBox.style.display = "none";
        if (adminButton) adminButton.style.display = "none";
        return;
    }

    if (button) button.style.display = "none";
    if (userBox) userBox.style.display = "flex";

    if (name) {
        name.textContent =
            currentProfile?.full_name ||
            currentUser.email ||
            "Tài khoản";
    }

    const isAdmin =
        currentProfile?.role === "admin";

    if (role) {
        role.textContent =
            isAdmin ? "ADMIN" : "KHÁCH";
        role.style.display = "inline-block";
    }

    if (adminButton) {
        adminButton.style.display =
            isAdmin ? "inline-block" : "none";
    }

    ensureMyBookingsUI();
}


async function initAuth() {
    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("SESSION ERROR:", error);
        return;
    }

    await loadCurrentProfile(
        data?.session?.user || null
    );
}


/* =========================================================
   CHARACTERS
========================================================= */

async function loadCharactersFromSupabase() {
    const {
        data,
        error
    } = await supabaseClient
        .from("characters")
        .select(`
            id,
            name,
            category,
            description,
            address,
            image_url,
            included_items,
            is_active,
            created_at
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("CHARACTERS ERROR:", error);
        showToast("Không thể tải danh sách nhân vật.");
        return;
    }

    characters =
        (data || []).map(character => ({
            id: character.id,
            name: character.name || "Chưa có tên",
            category: character.category || "Khác",
            description: character.description || "Chưa có mô tả.",
            address: character.address || "Chưa cập nhật địa chỉ",
            image:
                character.image_url ||
                "https://placehold.co/700x900?text=No+Image",
            items:
                Array.isArray(character.included_items)
                    ? character.included_items
                    : [],
            rentedDays: [],
            rentalMeta: new Map(),
            preparationDays: [],
            preparationMeta: new Map()
        }));

    showCharacters();
}


function showCharacters(list = characters) {
    if (!characterList) return;

    characterList.innerHTML = "";

    if (characterCount) {
        characterCount.textContent =
            `${list.length} nhân vật`;
    }

    if (list.length === 0) {
        characterList.innerHTML = `
            <p style="grid-column:1/-1;color:#888;">
                Không tìm thấy nhân vật.
            </p>
        `;
        return;
    }

    list.forEach(character => {
        const card =
            document.createElement("article");

        card.className = "character-card";

        const image = escapeHtml(character.image);
        const name = escapeHtml(character.name);
        const category = escapeHtml(character.category);
        const address = escapeHtml(character.address);

        card.innerHTML = `
            <img
                class="character-card-image"
                src="${image}"
                alt="${name}"
            >
            <div class="character-card-info">
                <div class="character-card-category">
                    ${category}
                </div>
                <h3 class="character-card-name">
                    ${name}
                </h3>
                <div class="character-card-address">
                    ${address}
                </div>
            </div>
        `;

        card.onclick = () => {
            openCharacter(character.id);
        };

        characterList.appendChild(card);
    });
}


function searchCharacters() {
    const input =
        document.getElementById("search-input");

    if (!input) return;

    const keyword =
        input.value
            .toLowerCase()
            .trim();

    if (!keyword) {
        showCharacters();
        return;
    }

    const result =
        characters.filter(character =>
            String(character.name)
                .toLowerCase()
                .includes(keyword) ||
            String(character.category)
                .toLowerCase()
                .includes(keyword) ||
            String(character.address)
                .toLowerCase()
                .includes(keyword)
        );

    showCharacters(result);
}


/* =========================================================
   CHARACTER DETAIL
========================================================= */

async function openCharacter(id) {
    const character =
        characters.find(item => item.id === id);

    if (!character) return;

    selectedCharacter = character;

    homePage?.classList.add("hidden");
    characterPage?.classList.remove("hidden");

    const detailImage =
        document.getElementById("detail-image");

    if (detailImage) {
        detailImage.src = character.image;
        detailImage.alt = character.name;
    }

    const detailCategory =
        document.getElementById("detail-category");

    if (detailCategory) {
        detailCategory.textContent = character.category;
    }

    const detailName =
        document.getElementById("detail-name");

    if (detailName) {
        detailName.textContent = character.name;
    }

    const detailDescription =
        document.getElementById("detail-description");

    if (detailDescription) {
        detailDescription.textContent = character.description;
    }

    const detailAddress =
        document.getElementById("detail-address");

    if (detailAddress) {
        detailAddress.textContent =
            character.address ||
            "Chưa cập nhật địa chỉ";
    }

    const items =
        document.getElementById("detail-items");

    if (items) {
        items.innerHTML = "";

        character.items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            items.appendChild(li);
        });
    }

    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();

    character.rentedDays = [];
    character.rentalMeta = new Map();
    character.preparationDays = [];
    character.preparationMeta = new Map();

    renderCalendar();
    await loadRentalCalendarData();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function goHome() {
    characterPage?.classList.add("hidden");
    homePage?.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function focusSearch() {
    goHome();

    setTimeout(() => {
        document
            .getElementById("search-input")
            ?.focus();
    }, 100);
}


/* =========================================================
   RENTAL CALENDAR
========================================================= */

function renderCalendar() {
    if (!selectedCharacter) return;

    const calendar =
        document.getElementById("calendar");

    const monthTitle =
        document.getElementById("month-title");

    if (!calendar || !monthTitle) return;

    const monthNames = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
        "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
        "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    monthTitle.textContent =
        `${monthNames[currentMonth]} ${currentYear}`;

    calendar.innerHTML = "";

    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        .forEach(dayName => {
            const element =
                document.createElement("div");

            element.className = "calendar-weekday";
            element.textContent = dayName;
            calendar.appendChild(element);
        });

    const firstDay =
        new Date(
            currentYear,
            currentMonth,
            1
        ).getDay();

    const mondayIndex =
        firstDay === 0
            ? 6
            : firstDay - 1;

    for (let i = 0; i < mondayIndex; i++) {
        const empty =
            document.createElement("div");

        empty.className = "calendar-empty";
        calendar.appendChild(empty);
    }

    const daysInMonth =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const date =
            new Date(
                currentYear,
                currentMonth,
                day
            );

        const dateString =
            formatLocalDate(date);

        const rental =
            selectedCharacter.rentalMeta?.get(dateString) ||
            null;

        const preparation =
            selectedCharacter.preparationMeta?.get(dateString) ||
            null;

        const rented =
            selectedCharacter.rentedDays.includes(day);

        const inCooldown =
            selectedCharacter.preparationDays?.includes(day) &&
            !rented;

        const past =
            date < today;

        const element =
            document.createElement("div");

        let statusClass = "available";
        let statusText = "Còn trống";
        let timeText = "";
        let titleText = "";

        if (rented) {
            statusClass = "rented";

            const rentalStatus =
                String(rental?.status || "").toLowerCase();

            statusText =
                rentalStatus === "pending"
                    ? "Đang chờ xác nhận"
                    : "Đã thuê";

            if (rental?.created_at) {
                timeText = `
                    <small class="rental-time">
                        Đặt lúc ${escapeHtml(
                            formatRentalTime(
                                rental.created_at
                            )
                        )}
                    </small>
                `;
            }

            titleText =
                rentalStatus === "pending"
                    ? "Ngày này đang có yêu cầu đặt lịch chờ shop xác nhận."
                    : "Ngày này đã có người thuê.";
        } else if (inCooldown) {
            statusClass = "preparation";
            statusText = "Thời gian chuẩn bị";

            if (preparation?.until) {
                const untilDate =
                    parseLocalDate(preparation.until);

                if (untilDate) {
                    titleText =
                        `Ngày này đang được khóa để shop có thời gian xử lý đồ. Có thể nhận slot lại từ ${untilDate.toLocaleDateString("vi-VN")}.`;
                }
            }

            if (preparation?.source?.created_at) {
                timeText = `
                    <small class="rental-time">
                        Sau đơn ${escapeHtml(
                            formatRentalTime(
                                preparation.source.created_at
                            )
                        )}
                    </small>
                `;
            }
        } else if (past) {
            statusClass = "past";
            statusText = "Đã qua";
            titleText = "Ngày này đã qua.";
        }

        element.className =
            `calendar-day ${statusClass}${past ? " past" : ""}`;

        if (titleText) {
            element.title = titleText;
        }

        element.innerHTML = `
            <div class="calendar-day-number">
                ${day}
            </div>
            <span class="day-status">
                ${statusText}
            </span>
            ${timeText}
        `;

        if (!rented && !inCooldown && !past) {
            element.title = "Ngày đang trống — vui lòng nhắn Chiyoo Shop để được hỗ trợ thuê.";
            element.onclick = () => showToast("Ngày này đang trống. Bạn hãy nhắn Chiyoo Shop để shop xác nhận lịch thuê nhé!");
        }

        calendar.appendChild(element);
    }
}

async function previousMonth() {
    currentMonth--;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    renderCalendar();
    await loadRentalCalendarData();
}


async function nextMonth() {
    currentMonth++;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderCalendar();
    await loadRentalCalendarData();
}


/* =========================================================
   LOAD REAL RENTAL DATA
========================================================= */

async function loadRentalCalendarData() {
    if (!selectedCharacter?.id) return;

    const firstDate =
        makeDateString(
            currentYear,
            currentMonth,
            1
        );

    const lastDay =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();

    const lastDate =
        makeDateString(
            currentYear,
            currentMonth,
            lastDay
        );

    /*
       Lấy dư 6 ngày hai đầu tháng để bắt được
       thời gian chuẩn bị từ đơn ở tháng trước/sau.
    */
    const queryStart =
        addDaysToDateString(
            firstDate,
            -COOLDOWN_DAYS
        );

    const queryEnd =
        addDaysToDateString(
            lastDate,
            COOLDOWN_DAYS
        );

    // Public calendar uses the privacy-safe RPC; it never reads rental/customer rows.
    const {
        data: busyRanges,
        error
    } = await supabaseClient.rpc("public_rental_busy_ranges", {
        p_from: queryStart,
        p_to: queryEnd
    });

    const data = (busyRanges || [])
        .filter(range => String(range.character_id) === String(selectedCharacter.id))
        .map((range, index) => ({
            id: `busy-${index}`,
            character_id: range.character_id,
            start_date: range.busy_from,
            end_date: range.busy_to,
            status: "confirmed",
            created_at: ""
        }));

    if (error) {
        console.error(
            "LOAD RENTALS ERROR:",
            error
        );
        return;
    }

    const rentedDays = [];
    const rentalMeta = new Map();
    const preparationDays = [];
    const preparationMeta = new Map();

    const setCooldownMeta = (
        dateString,
        rental,
        until
    ) => {
        if (
            dateString < firstDate ||
            dateString > lastDate
        ) {
            return;
        }

        const date =
            parseLocalDate(dateString);

        if (!date) return;

        if (rentalMeta.has(dateString)) {
            return;
        }

        const dayNumber =
            date.getDate();

        if (!preparationDays.includes(dayNumber)) {
            preparationDays.push(dayNumber);
        }

        const existing =
            preparationMeta.get(dateString);

        if (
            !existing ||
            new Date(rental.created_at || 0) >
            new Date(existing.source?.created_at || 0)
        ) {
            preparationMeta.set(
                dateString,
                {
                    source: rental,
                    until
                }
            );
        }
    };

    (data || []).forEach(rental => {
        if (!rentalBlocksDate(rental.status)) {
            return;
        }

        const start =
            parseLocalDate(rental.start_date);

        const end =
            parseLocalDate(rental.end_date);

        if (!start || !end) {
            return;
        }

        /* Ngày thực tế đã thuê. */
        const occupiedCursor =
            new Date(start);

        while (occupiedCursor <= end) {
            const dateString =
                formatLocalDate(occupiedCursor);

            if (
                dateString >= firstDate &&
                dateString <= lastDate
            ) {
                const dayNumber =
                    occupiedCursor.getDate();

                if (!rentedDays.includes(dayNumber)) {
                    rentedDays.push(dayNumber);
                }

                const existing =
                    rentalMeta.get(dateString);

                if (
                    !existing ||
                    new Date(
                        rental.created_at || 0
                    ) <
                    new Date(
                        existing.created_at || 0
                    )
                ) {
                    rentalMeta.set(
                        dateString,
                        rental
                    );
                }
            }

            occupiedCursor.setDate(
                occupiedCursor.getDate() + 1
            );
        }

        /*
           Khóa 6 ngày trước ngày bắt đầu.
           Ví dụ thuê CN 06/09:
           01/09 -> 05/09 bị khóa.
        */
        for (
            let offset = 1;
            offset <= COOLDOWN_DAYS;
            offset++
        ) {
            const blockedDate =
                addDaysToDateString(
                    rental.start_date,
                    -offset
                );

            if (blockedDate) {
                setCooldownMeta(
                    blockedDate,
                    rental,
                    rental.start_date
                );
            }
        }

        /*
           Khóa 6 ngày sau ngày kết thúc.
           Ví dụ thuê CN 06/09:
           07/09 -> 12/09 bị khóa.
           13/09 (đủ 7 ngày) được nhận slot tiếp.
        */
        for (
            let offset = 1;
            offset <= COOLDOWN_DAYS;
            offset++
        ) {
            const blockedDate =
                addDaysToDateString(
                    rental.end_date,
                    offset
                );

            if (blockedDate) {
                const nextAvailableDate =
                    addDaysToDateString(
                        rental.end_date,
                        MIN_RENTAL_GAP_DAYS
                    );

                setCooldownMeta(
                    blockedDate,
                    rental,
                    nextAvailableDate
                );
            }
        }
    });

    const finalCooldownDays =
        preparationDays.filter(dayNumber => {
            return !rentedDays.includes(dayNumber);
        });

    selectedCharacter.rentedDays =
        rentedDays;

    selectedCharacter.rentalMeta =
        rentalMeta;

    selectedCharacter.preparationDays =
        finalCooldownDays;

    selectedCharacter.preparationMeta =
        preparationMeta;

    renderCalendar();
}

/* =========================================================
   AVAILABILITY CHECK BEFORE INSERT
========================================================= */

async function checkRentalAvailability(
    characterId,
    startDate,
    endDate
) {
    /*
       Hai lần thuê phải cách nhau ít nhất 7 ngày.

       Vùng xung đột của một yêu cầu mới:
       startDate - 6 ngày -> endDate + 6 ngày.
    */
    const conflictStart =
        addDaysToDateString(
            startDate,
            -COOLDOWN_DAYS
        );

    const conflictEnd =
        addDaysToDateString(
            endDate,
            COOLDOWN_DAYS
        );

    const {
        data,
        error
    } = await supabaseClient
        .from("rentals")
        .select(
            "id, start_date, end_date, status, created_at"
        )
        .eq(
            "character_id",
            characterId
        )
        .lte(
            "start_date",
            conflictEnd
        )
        .gte(
            "end_date",
            conflictStart
        )
        .limit(50);

    if (error) {
        console.error(
            "AVAILABILITY ERROR:",
            error
        );

        return {
            available: false,
            error
        };
    }

    const blockingRental =
        (data || []).find(rental => {
            if (!rentalBlocksDate(rental.status)) {
                return false;
            }

            return dateRangesOverlap(
                rental.start_date,
                rental.end_date,
                conflictStart,
                conflictEnd
            );
        });

    return {
        available: !blockingRental,
        blockingRental:
            blockingRental || null,
        error: null
    };
}

/* =========================================================
   BOOKING
========================================================= */

function openBooking(day) {
    showToast("Website hiện chỉ xem lịch. Vui lòng liên hệ Chiyoo Shop để chốt đơn thuê.");
    return;
    /* legacy customer booking flow disabled */
    if (!selectedCharacter) return;

    const dateString =
        makeDateString(
            currentYear,
            currentMonth,
            day
        );

    if (
        selectedCharacter.rentalMeta?.has(
            dateString
        )
    ) {
        showToast(
            "Ngày này đã có người thuê. Vui lòng chọn ngày khác."
        );
        return;
    }

    if (
        selectedCharacter.preparationMeta?.has(
            dateString
        )
    ) {
        const preparationInfo =
            selectedCharacter.preparationMeta.get(
                dateString
            );

        const untilDate =
            parseLocalDate(
                preparationInfo?.until
            );

        const untilText = untilDate
            ? untilDate.toLocaleDateString("vi-VN")
            : "";

        showToast(
            untilText
                ? `Ngày này đang trong thời gian chuẩn bị. Slot kế tiếp từ ${untilText}.`
                : "Ngày này đang trong thời gian chuẩn bị. Vui lòng chọn ngày khác."
        );
        return;
    }

    if (!currentUser) {
        pendingBookingDay = day;

        openAuthModal(
            "Bạn cần đăng nhập để gửi yêu cầu thuê."
        );
        return;
    }

    selectedBookingDay = day;

    const modal =
        document.getElementById("booking-modal");

    if (!modal) return;

    const title =
        document.getElementById("booking-title");

    if (title) {
        title.textContent =
            `Thuê ${selectedCharacter.name}`;
    }

    const dateElement =
        document.getElementById("booking-date");

    if (dateElement) {
        dateElement.textContent =
            `Ngày ${day}/${currentMonth + 1}/${currentYear}`;
    }

    const nameInput =
        document.getElementById("customer-name");

    if (nameInput) {
        nameInput.value =
            currentProfile?.full_name || "";
    }

    const phoneInput =
        document.getElementById("customer-phone");

    if (phoneInput) {
        phoneInput.value =
            "";
    }

    updateContactFieldUI();

    const noteInput =
        document.getElementById("customer-note");

    if (noteInput) {
        noteInput.value = "";
    }

    const contactMethod =
        document.getElementById("customer-contact-method");

    if (contactMethod) {
        contactMethod.value = "Zalo";
    }

    const help =
        document.getElementById("booking-contact-help");

    if (help) {
        help.textContent =
            "Đây là yêu cầu đặt lịch, chưa phải xác nhận thuê. Shop sẽ nhận thông báo qua email và liên hệ bạn để trao đổi và chốt đơn.";
    }

    modal.classList.remove("hidden");
    nameInput?.focus();
}


function closeBooking() {
    document
        .getElementById("booking-modal")
        ?.classList.add("hidden");

    selectedBookingDay = null;
}


async function submitBooking(event) {
    event.preventDefault();

    if (!currentUser) {
        closeBooking();
        pendingBookingDay = null;

        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );
        return;
    }

    if (
        !selectedCharacter ||
        selectedBookingDay == null
    ) {
        showToast(
            "Không xác định được ngày thuê."
        );
        return;
    }

    const name =
        document
            .getElementById("customer-name")
            ?.value
            ?.trim() || "";

    const phone =
        document
            .getElementById("customer-phone")
            ?.value
            ?.trim() || "";

    const note =
        document
            .getElementById("customer-note")
            ?.value
            ?.trim() || "";

    const contactMethod =
        document
            .getElementById("customer-contact-method")
            ?.value
            ?.trim() || "Zalo";

    if (!name) {
        showToast("Vui lòng nhập họ tên.");
        return;
    }

    if (!phone) {
        showToast("Vui lòng nhập số điện thoại.");
        return;
    }

    const startDate =
        makeDateString(
            currentYear,
            currentMonth,
            selectedBookingDay
        );

    const endDate = startDate;

    /*
       Kiểm tra database ngay trước INSERT.
       Nếu một tài khoản khác vừa đặt, ở đây sẽ phát hiện.
    */
    const availability =
        await checkRentalAvailability(
            selectedCharacter.id,
            startDate,
            endDate
        );

    if (availability.error) {
        showToast(
            "Không thể kiểm tra ngày thuê. Vui lòng thử lại."
        );
        return;
    }

    if (!availability.available) {
        await loadRentalCalendarData();
        closeBooking();

        if (availability.blockingRental) {
            const nextAvailableDate =
                addDaysToDateString(
                    availability.blockingRental.end_date,
                    MIN_RENTAL_GAP_DAYS
                );

            const nextAvailableText =
                parseLocalDate(nextAvailableDate)
                    ?.toLocaleDateString("vi-VN") || "";

            showToast(
                nextAvailableText
                    ? `Ngày này quá sát một đơn thuê khác. Slot kế tiếp từ ${nextAvailableText}.`
                    : "Ngày này quá sát một đơn thuê khác. Vui lòng chọn ngày khác."
            );
        } else {
            showToast(
                "Ngày này quá sát một đơn thuê khác. Vui lòng chọn ngày khác."
            );
        }

        return;
    }

    const submitButton =
        event.target.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Đang gửi...";
    }

    try {
        /* Cập nhật profile, nhưng không để lỗi profile chặn đơn. */
        const {
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .update({
                full_name: name,
                phone: phone
            })
            .eq(
                "id",
                currentUser.id
            );

        if (profileError) {
            console.warn(
                "PROFILE UPDATE ERROR:",
                profileError
            );
        }

        const customerNote = [
            `Họ tên: ${name}`,
            `${contactMethod}: ${phone}`,
            note
                ? `Ghi chú: ${note}`
                : "",
            "---",
            "Đây là yêu cầu đặt lịch, chưa phải xác nhận thuê."
        ]
            .filter(Boolean)
            .join("\n");

        const {
            data,
            error
        } = await supabaseClient
            .from("rentals")
            .insert({
                user_id: currentUser.id,
                character_id: selectedCharacter.id,
                start_date: startDate,
                end_date: endDate,
                customer_note: customerNote,
                status: "pending"
            })
            .select()
            .single();

        if (error) {
            console.error(
                "BOOKING ERROR:",
                error
            );

            /*
               Bắt các lỗi cạnh tranh thường gặp.
               Ràng buộc database vẫn là lớp bảo vệ cuối cùng.
            */
            if (
                error.code === "23P01" ||
                error.code === "23505" ||
                /overlap|duplicate|already|conflict|exclusion/i.test(
                    error.message || ""
                )
            ) {
                await loadRentalCalendarData();
                closeBooking();

                showToast(
                    "Ngày này vừa có người đặt hoặc đang trong thời gian chuẩn bị. Vui lòng chọn ngày khác."
                );
                return;
            }

            throw error;
        }

        console.log(
            "BOOKING CREATED:",
            data
        );

        if (currentProfile) {
            currentProfile.full_name = name;
            currentProfile.phone = phone;
        }

        closeBooking();

        if (event.target?.reset) {
            event.target.reset();
        }

        showToast(
            "Đã gửi yêu cầu đặt lịch! Shop sẽ nhận email và liên hệ bạn để chốt đơn."
        );

        /* Lấy lại created_at thật từ database. */
        await loadRentalCalendarData();

    } catch (error) {
        console.error(
            "BOOKING ERROR:",
            error
        );

        showToast(
            "Không thể tạo đơn: " +
            (error?.message || "Lỗi không xác định")
        );

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                "Đặt lịch";
        }
    }
}


/* =========================================================
   SUPABASE REALTIME
========================================================= */

function subscribeToRentalRealtime() {
    if (rentalRealtimeChannel) {
        supabaseClient.removeChannel(
            rentalRealtimeChannel
        );

        rentalRealtimeChannel = null;
    }

    rentalRealtimeChannel =
        supabaseClient
            .channel("chiyoo-rentals-calendar")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "rentals"
                },
                async payload => {
                    console.log(
                        "REALTIME RENTAL UPDATE:",
                        payload
                    );

                    if (!selectedCharacter?.id) {
                        return;
                    }

                    const record =
                        payload.new ||
                        payload.old ||
                        {};

                    /*
                       Chỉ reload nếu thay đổi liên quan
                       tới nhân vật đang xem.
                    */
                    if (
                        record.character_id &&
                        String(record.character_id) !==
                        String(selectedCharacter.id)
                    ) {
                        return;
                    }

                    await loadRentalCalendarData();
                }
            )
            .subscribe(status => {
                console.log(
                    "RENTAL REALTIME STATUS:",
                    status
                );
            });
}


/* =========================================================
   IMAGE LIGHTBOX
========================================================= */

function openImageLightbox() {
    const detailImage =
        document.getElementById("detail-image");

    const lightbox =
        document.getElementById("image-lightbox");

    const lightboxImage =
        document.getElementById("lightbox-image");

    if (
        !detailImage ||
        !lightbox ||
        !lightboxImage
    ) {
        return;
    }

    if (!detailImage.src) return;

    lightboxImage.src = detailImage.src;
    lightboxImage.alt =
        detailImage.alt || "";

    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}


function closeImageLightbox() {
    const lightbox =
        document.getElementById("image-lightbox");

    if (!lightbox) return;

    lightbox.classList.add("hidden");
    document.body.style.overflow = "";
}


document.addEventListener("click", event => {
    if (
        event.target &&
        event.target.id === "detail-image"
    ) {
        openImageLightbox();
    }
});


document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeImageLightbox();
    }
});



/* =========================================================
   MY BOOKINGS
   - Khách xem các yêu cầu/đơn của chính mình.
   - Có thể hủy đơn đang pending/confirmed.
========================================================= */

function ensureMyBookingsUI() {
    if (!currentUser) return;

    const authUser =
        document.getElementById("auth-user");

    if (!authUser) return;

    if (document.getElementById("my-bookings-button")) {
        return;
    }

    const button = document.createElement("button");
    button.id = "my-bookings-button";
    button.className = "auth-button";
    button.type = "button";
    button.textContent = "Lịch của tôi";
    button.onclick = openMyBookings;

    authUser.insertBefore(
        button,
        authUser.querySelector('button[onclick="signOutUser()"]') || null
    );

    ensureMyBookingsModal();
}

function ensureMyBookingsModal() {
    if (document.getElementById("my-bookings-modal")) return;

    const modal = document.createElement("div");
    modal.id = "my-bookings-modal";
    modal.className = "modal hidden";

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeMyBookings()"></div>
        <div class="modal-box" style="max-width:760px;">
            <button
                class="modal-close"
                type="button"
                onclick="closeMyBookings()"
            >×</button>

            <p class="section-small">LỊCH CỦA TÔI</p>
            <h2>Yêu cầu đặt lịch của bạn</h2>

            <div
                id="my-bookings-list"
                style="display:grid;gap:12px;margin-top:18px;"
            >
                <p>Đang tải...</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function bookingStatusText(status) {
    const map = {
        pending: "Đang chờ xác nhận",
        confirmed: "Đã xác nhận",
        rejected: "Đã từ chối",
        declined: "Đã từ chối",
        cancelled: "Đã hủy",
        canceled: "Đã hủy",
        completed: "Hoàn tất",
        returned: "Đã trả đồ"
    };

    return map[String(status || "").toLowerCase()] ||
        "Không xác định";
}

async function openMyBookings() {
    if (!currentUser) {
        openAuthModal("Vui lòng đăng nhập để xem lịch của bạn.");
        return;
    }

    ensureMyBookingsModal();

    const modal =
        document.getElementById("my-bookings-modal");

    modal?.classList.remove("hidden");

    await loadMyBookings();
}

function closeMyBookings() {
    document
        .getElementById("my-bookings-modal")
        ?.classList.add("hidden");
}

async function loadMyBookings() {
    const box =
        document.getElementById("my-bookings-list");

    if (!box || !currentUser) return;

    box.innerHTML = "<p>Đang tải...</p>";

    const {
        data,
        error
    } = await supabaseClient
        .from("rentals")
        .select(`
            id,
            character_id,
            start_date,
            end_date,
            status,
            customer_note,
            created_at
        `)
        .eq("user_id", currentUser.id)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("MY BOOKINGS ERROR:", error);

        box.innerHTML = `
            <p>
                Không thể tải lịch của bạn.
                ${escapeHtml(error.message || "")}
            </p>
        `;
        return;
    }

    if (!data?.length) {
        box.innerHTML = `
            <p>
                Bạn chưa có yêu cầu đặt lịch nào.
            </p>
        `;
        return;
    }

    box.innerHTML = data.map(rental => {
        const character =
            characters.find(
                item =>
                    String(item.id) ===
                    String(rental.character_id)
            );

        const status =
            String(rental.status || "").toLowerCase();

        const canCancel =
            ["pending", "confirmed"].includes(status);

        const dateText =
            rental.start_date === rental.end_date
                ? rental.start_date
                : `${rental.start_date} → ${rental.end_date}`;

        return `
            <article
                style="
                    border:1px solid rgba(0,0,0,.1);
                    border-radius:14px;
                    padding:14px;
                "
            >
                <div style="display:flex;justify-content:space-between;gap:12px;">
                    <div>
                        <strong>
                            ${escapeHtml(
                                character?.name ||
                                "Nhân vật không còn tồn tại"
                            )}
                        </strong>

                        <div style="margin-top:5px;">
                            Ngày: ${escapeHtml(dateText)}
                        </div>

                        <div style="margin-top:5px;color:#777;">
                            Gửi lúc:
                            ${escapeHtml(
                                formatRentalTime(
                                    rental.created_at
                                )
                            )}
                        </div>
                    </div>

                    <strong>
                        ${escapeHtml(
                            bookingStatusText(rental.status)
                        )}
                    </strong>
                </div>

                ${
                    canCancel
                        ? `
                            <button
                                type="button"
                                style="
                                    margin-top:12px;
                                    padding:9px 13px;
                                    border:0;
                                    border-radius:9px;
                                    cursor:pointer;
                                "
                                onclick="cancelMyBooking('${escapeHtml(rental.id)}')"
                            >
                                Hủy lịch này
                            </button>
                          `
                        : ""
                }
            </article>
        `;
    }).join("");
}

async function cancelMyBooking(rentalId) {
    if (!currentUser || !rentalId) return;

    const confirmed =
        window.confirm(
            "Bạn chắc chắn muốn hủy yêu cầu/đơn này?"
        );

    if (!confirmed) return;

    const {
        data,
        error
    } = await supabaseClient
        .from("rentals")
        .update({
            status: "cancelled"
        })
        .eq("id", rentalId)
        .eq("user_id", currentUser.id)
        .in("status", ["pending", "confirmed"])
        .select("id")
        .maybeSingle();

    if (error) {
        console.error(
            "CANCEL MY BOOKING ERROR:",
            error
        );

        showToast(
            "Không thể hủy lịch: " +
            (error.message || "Lỗi không xác định")
        );

        return;
    }

    if (!data) {
        showToast(
            "Đơn này không còn ở trạng thái có thể hủy."
        );

        await loadMyBookings();
        return;
    }

    showToast("Đã hủy lịch.");

    await loadMyBookings();

    if (selectedCharacter) {
        await loadRentalCalendarData();
    }
}

/* =========================================================
   ADMIN
========================================================= */

function openAdminPage() {
    window.location.href = "admin.html";
}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

supabaseClient.auth.onAuthStateChange(
    (_event, session) => {
        setTimeout(() => {
            loadCurrentProfile(
                session?.user || null
            );
        }, 0);
    }
);


/* =========================================================
   GLOBAL FUNCTIONS FOR INLINE HTML
========================================================= */

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.signOutUser = signOutUser;
window.searchCharacters = searchCharacters;
window.openCharacter = openCharacter;
window.goHome = goHome;
window.focusSearch = focusSearch;
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.openBooking = openBooking;
window.closeBooking = closeBooking;
window.submitBooking = submitBooking;
window.openMyBookings = openMyBookings;
window.closeMyBookings = closeMyBookings;
window.cancelMyBooking = cancelMyBooking;
window.openImageLightbox = openImageLightbox;
window.closeImageLightbox = closeImageLightbox;
window.openAdminPage = openAdminPage;


/* =========================================================
   INIT
========================================================= */

async function initApp() {
    try {
        ensureBookingContactFields();
        await loadCharactersFromSupabase();
        await initAuth();
        subscribeToRentalRealtime();
    } catch (error) {
        console.error(
            "INIT ERROR:",
            error
        );
    }
}


initApp();
