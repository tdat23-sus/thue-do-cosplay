/* =========================================================
   CHIYOO SHOP - SCRIPT.JS
   - Supabase Auth
   - Characters
   - Rental calendar from real rentals table
   - Realtime rental updates
   - Double availability check before INSERT
   - Shows actual created_at time for rented days
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

            if (pendingBookingDay !== null) {
                const day = pendingBookingDay;
                pendingBookingDay = null;

                setTimeout(() => {
                    openBooking(day);
                }, 150);
            }
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
            rentalMeta: new Map()
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

        const rented =
            selectedCharacter.rentedDays.includes(day);

        const past = date < today;

        const element =
            document.createElement("div");

        element.className =
            `calendar-day ${
                rented
                    ? "rented"
                    : "available"
            }${past ? " past" : ""}`;

        let statusText = "Còn trống";
        let timeText = "";

        if (rented) {
            statusText = "Đã thuê";

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
        } else if (past) {
            statusText = "Đã qua";
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

        if (!rented && !past) {
            element.onclick = () => {
                openBooking(day);
            };
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
            created_at
        `)
        .eq(
            "character_id",
            selectedCharacter.id
        )
        .lte(
            "start_date",
            lastDate
        )
        .gte(
            "end_date",
            firstDate
        )
        .order(
            "created_at",
            { ascending: true }
        );

    if (error) {
        console.error(
            "LOAD RENTALS ERROR:",
            error
        );
        return;
    }

    const rentedDays = [];
    const rentalMeta = new Map();

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

        const cursor = new Date(start);

        while (cursor <= end) {
            const dateString =
                formatLocalDate(cursor);

            if (
                dateString >= firstDate &&
                dateString <= lastDate
            ) {
                const dayNumber =
                    cursor.getDate();

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

            cursor.setDate(
                cursor.getDate() + 1
            );
        }
    });

    selectedCharacter.rentedDays =
        rentedDays;

    selectedCharacter.rentalMeta =
        rentalMeta;

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
    const {
        data,
        error
    } = await supabaseClient
        .from("rentals")
        .select(
            "id, start_date, end_date, status"
        )
        .eq(
            "character_id",
            characterId
        )
        .lte(
            "start_date",
            endDate
        )
        .gte(
            "end_date",
            startDate
        )
        .limit(20);

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
        (data || []).find(rental =>
            rentalBlocksDate(rental.status)
        );

    return {
        available: !blockingRental,
        error: null
    };
}


/* =========================================================
   BOOKING
========================================================= */

function openBooking(day) {
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
            "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
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
            currentProfile?.phone || "";
    }

    const noteInput =
        document.getElementById("customer-note");

    if (noteInput) {
        noteInput.value = "";
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

        showToast(
            "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
        );
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
            `SĐT: ${phone}`,
            note
                ? `Ghi chú: ${note}`
                : ""
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
                /overlap|duplicate|already|conflict/i.test(
                    error.message || ""
                )
            ) {
                await loadRentalCalendarData();
                closeBooking();

                showToast(
                    "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
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
            "Đặt thuê thành công! Shop sẽ liên hệ với bạn."
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
                "Gửi yêu cầu thuê";
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
window.openImageLightbox = openImageLightbox;
window.closeImageLightbox = closeImageLightbox;
window.openAdminPage = openAdminPage;


/* =========================================================
   INIT
========================================================= */

async function initApp() {
    try {
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
