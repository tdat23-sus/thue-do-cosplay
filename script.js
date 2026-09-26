/* =========================================
   SUPABASE + AUTH
========================================= */

const SUPABASE_URL =
    "https://rydkgmtlmhjftbwukzdn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_wIOEpyFJLjH_aWSwnUIF-g_WCvEUOot";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


let currentUser = null;
let currentProfile = null;
let authMode = "login";
let pendingBookingDay = null;


/* =========================================
   CHARACTER DATA
========================================= */

let characters = [];


/* =========================================
   STATE
========================================= */

let selectedBookingDay = null;
let selectedCharacter = null;

let currentMonth = 8;
let currentYear = 2026;


/* =========================================
   RENTAL CALENDAR STATE
========================================= */

let rentedDays = new Set();


/* =========================================
   ELEMENTS
========================================= */

const characterList =
    document.getElementById(
        "character-list"
    );

const calendar =
    document.getElementById(
        "calendar"
    );

const calendarTitle =
    document.getElementById(
        "calendar-title"
    );

const prevMonthBtn =
    document.getElementById(
        "prev-month"
    );

const nextMonthBtn =
    document.getElementById(
        "next-month"
    );

const bookingModal =
    document.getElementById(
        "booking-modal"
    );

const bookingForm =
    document.getElementById(
        "booking-form"
    );

const closeBookingBtn =
    document.getElementById(
        "close-booking"
    );


/* =========================================
   HELPERS
========================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function parseDate(dateString) {

    if (!dateString) {
        return null;
    }

    const parts =
        String(dateString)
            .split("-")
            .map(Number);

    if (
        parts.length !== 3 ||
        parts.some(
            Number.isNaN
        )
    ) {
        return null;
    }

    return new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
    );
}


function normalizeDateString(value) {

    if (!value) {
        return null;
    }

    const text =
        String(value)
            .slice(0, 10);

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {
        return text;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return formatDate(date);
}


function showToast(message) {

    const existing =
        document.querySelector(
            ".custom-toast"
        );

    if (existing) {
        existing.remove();
    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        "custom-toast";

    toast.textContent =
        message;

    toast.style.position =
        "fixed";

    toast.style.left =
        "50%";

    toast.style.bottom =
        "30px";

    toast.style.transform =
        "translateX(-50%)";

    toast.style.zIndex =
        "99999";

    toast.style.padding =
        "12px 20px";

    toast.style.borderRadius =
        "10px";

    toast.style.background =
        "rgba(0,0,0,.85)";

    toast.style.color =
        "#fff";

    toast.style.fontSize =
        "14px";

    document.body.appendChild(
        toast
    );

    setTimeout(() => {

        toast.remove();

    }, 3000);
}


/* =========================================
   AUTH
========================================= */

async function loadCurrentUser() {

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getUser();

    if (error) {

        console.error(
            "getUser error:",
            error
        );

        currentUser = null;

        return;
    }

    currentUser =
        data?.user || null;
}


async function loadCurrentProfile() {

    currentProfile = null;

    if (!currentUser) {
        return;
    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();

    if (error) {

        console.error(
            "load profile error:",
            error
        );

        return;
    }

    currentProfile =
        data;
}


async function refreshAuthState() {

    await loadCurrentUser();

    await loadCurrentProfile();

    updateAuthUI();
}


function updateAuthUI() {

    const loginButtons =
        document.querySelectorAll(
            "[data-auth-login]"
        );

    const logoutButtons =
        document.querySelectorAll(
            "[data-auth-logout]"
        );

    loginButtons.forEach(
        button => {

            button.style.display =
                currentUser
                    ? "none"
                    : "";

        }
    );

    logoutButtons.forEach(
        button => {

            button.style.display =
                currentUser
                    ? ""
                    : "none";

        }
    );

    const userNameElements =
        document.querySelectorAll(
            "[data-user-name]"
        );

    userNameElements.forEach(
        element => {

            element.textContent =
                currentProfile?.full_name ||
                currentUser?.email ||
                "";

        }
    );
}


/* =========================================
   AUTH MODAL
========================================= */

function openAuthModal(
    message = ""
) {

    const modal =
        document.getElementById(
            "auth-modal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "hidden"
    );

    modal.style.display =
        "flex";

    setAuthMode(
        "login"
    );

    const emailInput =
        document.getElementById(
            "auth-email"
        );

    if (emailInput) {

        setTimeout(() => {

            emailInput.focus();

        }, 50);

    }

    if (message) {

        const authMessage =
            document.getElementById(
                "auth-message"
            );

        if (authMessage) {

            authMessage.textContent =
                message;

            authMessage.style.display =
                "block";

        } else {

            showToast(message);

        }

    }
}


function closeAuthModal() {

    const modal =
        document.getElementById(
            "auth-modal"
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );

    modal.style.display =
        "none";
}


function setAuthMode(
    mode
) {

    authMode =
        mode === "register"
            ? "register"
            : "login";

    const title =
        document.getElementById(
            "auth-title"
        );

    if (title) {

        title.textContent =
            authMode === "register"
                ? "Tạo tài khoản"
                : "Đăng nhập";

    }

    const submit =
        document.getElementById(
            "auth-submit"
        );

    if (submit) {

        submit.textContent =
            authMode === "register"
                ? "Đăng ký"
                : "Đăng nhập";

    }

    const nameField =
        document.getElementById(
            "auth-name"
        );

    const nameLabel =
        document.getElementById(
            "auth-name-label"
        );

    if (nameField) {

        nameField.required =
            authMode === "register";

        nameField.style.display =
            authMode === "register"
                ? ""
                : "none";

    }

    if (nameLabel) {

        nameLabel.style.display =
            authMode === "register"
                ? ""
                : "none";

    }

    const switchText =
        document.getElementById(
            "auth-switch-text"
        );

    if (switchText) {

        switchText.textContent =
            authMode === "register"
                ? "Đã có tài khoản?"
                : "Chưa có tài khoản?";

    }

    const switchButton =
        document.getElementById(
            "auth-switch"
        );

    if (switchButton) {

        switchButton.textContent =
            authMode === "register"
                ? "Đăng nhập"
                : "Đăng ký";

    }
}


function toggleAuthMode() {

    setAuthMode(
        authMode === "login"
            ? "register"
            : "login"
    );
}


async function handleAuthSubmit(
    event
) {

    event.preventDefault();

    const emailInput =
        document.getElementById(
            "auth-email"
        );

    const passwordInput =
        document.getElementById(
            "auth-password"
        );

    const nameInput =
        document.getElementById(
            "auth-name"
        );

    const submitButton =
        document.getElementById(
            "auth-submit"
        );

    const email =
        emailInput?.value
            ?.trim();

    const password =
        passwordInput?.value ||
        "";

    const name =
        nameInput?.value
            ?.trim() ||
        "";

    if (
        !email ||
        !password
    ) {

        alert(
            "Vui lòng nhập email và mật khẩu."
        );

        return;
    }

    if (
        authMode === "register" &&
        !name
    ) {

        alert(
            "Vui lòng nhập họ tên."
        );

        return;
    }

    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.dataset.originalText =
            submitButton.textContent;

        submitButton.textContent =
            "Đang xử lý...";

    }

    try {

        /* =========================
           REGISTER
        ========================= */

        if (
            authMode ===
            "register"
        ) {

            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .signUp({

                        email,

                        password,

                        options: {

                            data: {
                                full_name:
                                    name
                            }

                        }

                    });

            if (error) {
                throw error;
            }

            if (data?.session) {

                currentUser =
                    data.user ||
                    null;

                await loadCurrentProfile();

                updateAuthUI();

                alert(
                    "Tạo tài khoản thành công!"
                );

                closeAuthModal();

            } else {

                alert(
                    "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản nếu hệ thống yêu cầu."
                );

            }

            return;
        }


        /* =========================
           LOGIN
        ========================= */

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signInWithPassword({

                    email,

                    password

                });

        if (error) {
            throw error;
        }

        currentUser =
            data?.user ||
            null;

        await loadCurrentProfile();

        updateAuthUI();

        closeAuthModal();

        alert(
            "Đăng nhập thành công!"
        );


        /* =========================
           CONTINUE PENDING BOOKING
        ========================= */

        if (
            pendingBookingDay !==
            null
        ) {

            const day =
                pendingBookingDay;

            pendingBookingDay =
                null;

            setTimeout(() => {

                openBooking(
                    day
                );

            }, 150);

        }


    } catch (error) {

        console.error(
            "AUTH ERROR:",
            error
        );

        alert(
            error?.message ||
            "Đăng nhập/đăng ký thất bại."
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                submitButton.dataset.originalText ||
                (
                    authMode === "register"
                        ? "Đăng ký"
                        : "Đăng nhập"
                );

        }

    }
}


async function signOutUser() {

    const {
        error
    } =
        await supabaseClient
            .auth
            .signOut();

    if (error) {

        console.error(
            "signOut error:",
            error
        );

        alert(
            "Đăng xuất thất bại."
        );

        return;
    }

    currentUser = null;

    currentProfile = null;

    updateAuthUI();

    closeAuthModal();

    showToast(
        "Đã đăng xuất."
    );
}


async function initAuth() {

    await refreshAuthState();

    supabaseClient
        .auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                currentUser =
                    session?.user ||
                    null;

                await loadCurrentProfile();

                updateAuthUI();

                if (
                    event ===
                    "SIGNED_IN"
                ) {

                    if (
                        pendingBookingDay !==
                        null
                    ) {

                        const day =
                            pendingBookingDay;

                        pendingBookingDay =
                            null;

                        setTimeout(() => {

                            openBooking(
                                day
                            );

                        }, 100);

                    }

                }

            }
        );
}


/* =========================================
   LOAD CHARACTERS
========================================= */

async function loadCharacters() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("characters")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    if (error) {

        console.error(
            "load characters error:",
            error
        );

        showToast(
            "Không thể tải danh sách nhân vật."
        );

        return;
    }

    characters =
        data || [];

    renderCharacters();
}


async function loadCharactersFromSupabase() {

    await loadCharacters();
}


function renderCharacters() {

    if (!characterList) {
        return;
    }

    characterList.innerHTML =
        "";

    characters.forEach(
        character => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "character-card";

            card.dataset.characterId =
                character.id;

            const image =
                character.image_url ||
                character.image ||
                "";

            const name =
                character.name ||
                "Nhân vật";

            card.innerHTML = `
                ${
                    image
                        ? `
                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                            >
                          `
                        : ""
                }

                <div class="character-card-content">
                    <h3>
                        ${escapeHtml(name)}
                    </h3>
                </div>
            `;

            card.addEventListener(
                "click",
                () => {

                    selectCharacter(
                        character
                    );

                }
            );

            characterList.appendChild(
                card
            );

        }
    );
}


/* =========================================
   CHARACTER SELECTION
========================================= */

async function selectCharacter(
    character
) {

    selectedCharacter =
        character;

    currentMonth =
        new Date().getMonth();

    currentYear =
        new Date().getFullYear();

    rentedDays =
        new Set();

    await loadRentedDays();

    renderCalendar();

    const calendarSection =
        document.getElementById(
            "calendar-section"
        );

    if (calendarSection) {

        calendarSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
}


/* =========================================
   LOAD REAL RENTAL DAYS
========================================= */

async function loadRentedDays() {

    rentedDays =
        new Set();

    if (
        !selectedCharacter?.id
    ) {
        return;
    }

    const startDate =
        formatDate(
            new Date(
                currentYear,
                currentMonth,
                1
            )
        );

    const endDate =
        formatDate(
            new Date(
                currentYear,
                currentMonth + 1,
                0
            )
        );

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "get_rented_dates",
                {
                    p_character_id:
                        Number(
                            selectedCharacter.id
                        ),

                    p_start_date:
                        startDate,

                    p_end_date:
                        endDate
                }
            );

    if (error) {

        console.error(
            "get_rented_dates error:",
            error
        );

        /*
           Không tự coi ngày là đã thuê
           nếu RPC lỗi.
        */

        return;
    }

    (
        data || []
    ).forEach(
        row => {

            const date =
                normalizeDateString(
                    row.rental_date
                );

            if (date) {

                rentedDays.add(
                    date
                );

            }

        }
    );
}


/* =========================================
   CHECK AVAILABILITY
========================================= */

async function checkRentalAvailability(
    characterId,
    startDate,
    endDate
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "is_rental_date_available",
                {
                    p_character_id:
                        Number(
                            characterId
                        ),

                    p_start_date:
                        startDate,

                    p_end_date:
                        endDate
                }
            );

    if (error) {

        console.error(
            "availability RPC error:",
            error
        );

        /*
           Nếu RPC lỗi, truy vấn trực tiếp
           để tránh cho phép đặt nhầm.
        */

        const fallback =
            await supabaseClient
                .from("rentals")
                .select(
                    "id,start_date,end_date,status"
                )
                .eq(
                    "character_id",
                    Number(
                        characterId
                    )
                )
                .in(
                    "status",
                    [
                        "pending",
                        "confirmed"
                    ]
                )
                .lte(
                    "start_date",
                    endDate
                )
                .gte(
                    "end_date",
                    startDate
                )
                .limit(1);

        if (
            fallback.error
        ) {

            console.error(
                "fallback availability error:",
                fallback.error
            );

            return {
                available: false,
                error:
                    fallback.error
            };
        }

        return {

            available:
                !(
                    fallback.data &&
                    fallback.data.length
                ),

            error:
                null

        };
    }

    return {

        available:
            data === true ||
            data?.available === true,

        error:
            null

    };
}


/* =========================================
   CALENDAR
========================================= */

function renderCalendar() {

    if (!calendar) {
        return;
    }

    const firstDay =
        new Date(
            currentYear,
            currentMonth,
            1
        );

    const lastDay =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        );

    const firstWeekDay =
        firstDay.getDay();

    const daysInMonth =
        lastDay.getDate();

    if (calendarTitle) {

        calendarTitle.textContent =
            `Tháng ${
                currentMonth + 1
            }/${currentYear}`;

    }

    calendar.innerHTML =
        "";

    const weekdayNames = [
        "CN",
        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7"
    ];

    weekdayNames.forEach(
        name => {

            const header =
                document.createElement(
                    "div"
                );

            header.className =
                "calendar-weekday";

            header.textContent =
                name;

            calendar.appendChild(
                header
            );

        }
    );

    for (
        let i = 0;
        i < firstWeekDay;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "calendar-day empty";

        calendar.appendChild(
            empty
        );

    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                currentYear,
                currentMonth,
                day
            );

        const dateString =
            formatDate(date);

        const cell =
            document.createElement(
                "button"
            );

        cell.type =
            "button";

        cell.className =
            "calendar-day";

        cell.dataset.date =
            dateString;

        const isRented =
            rentedDays.has(
                dateString
            );

        const isPast =
            date < today;

        if (isRented) {

            cell.classList.add(
                "rented"
            );

            cell.disabled =
                true;

            cell.innerHTML = `
                <span class="day-number">
                    ${day}
                </span>

                <span class="day-status">
                    Đã thuê
                </span>
            `;

        } else if (isPast) {

            cell.classList.add(
                "past"
            );

            cell.disabled =
                true;

            cell.innerHTML = `
                <span class="day-number">
                    ${day}
                </span>

                <span class="day-status">
                    Đã qua
                </span>
            `;

        } else {

            cell.classList.add(
                "available"
            );

            cell.innerHTML = `
                <span class="day-number">
                    ${day}
                </span>

                <span class="day-status">
                    Còn trống
                </span>
            `;

            cell.addEventListener(
                "click",
                () => {

                    openBooking(
                        day
                    );

                }
            );

        }

        calendar.appendChild(
            cell
        );
    }
}


/* =========================================
   MONTH NAVIGATION
========================================= */

async function previousMonth() {

    currentMonth--;

    if (
        currentMonth < 0
    ) {

        currentMonth =
            11;

        currentYear--;

    }

    await loadRentedDays();

    renderCalendar();
}


async function nextMonth() {

    currentMonth++;

    if (
        currentMonth > 11
    ) {

        currentMonth =
            0;

        currentYear++;

    }

    await loadRentedDays();

    renderCalendar();
}


function changeMonth(
    offset
) {

    if (offset < 0) {

        previousMonth();

    } else {

        nextMonth();

    }
}


/* =========================================
   BOOKING
========================================= */

function openBooking(
    day
) {

    const month =
        String(
            currentMonth + 1
        ).padStart(2, "0");

    const dayText =
        String(day)
            .padStart(2, "0");

    const dateString =
        `${currentYear}-${month}-${dayText}`;


    /*
       Nếu ngày đã thuê thì không mở form.
    */

    if (
        rentedDays.has(
            dateString
        )
    ) {

        alert(
            "Ngày này đã có người thuê. Vui lòng chọn ngày khác."
        );

        return;
    }


    /*
       Bắt buộc đăng nhập.
    */

    if (!currentUser) {

        pendingBookingDay =
            day;

        openAuthModal(
            "Bạn cần đăng nhập để gửi yêu cầu thuê."
        );

        return;
    }


    selectedBookingDay =
        day;


    const modal =
        document.getElementById(
            "booking-modal"
        );

    if (!modal) {
        return;
    }


    const title =
        document.getElementById(
            "booking-title"
        );

    if (title) {

        title.textContent =
            `Thuê ${
                selectedCharacter?.name ||
                "nhân vật"
            }`;

    }


    const bookingDate =
        document.getElementById(
            "booking-date"
        );

    if (bookingDate) {

        const date =
            parseDate(
                dateString
            );

        bookingDate.textContent =
            date
                ? `Ngày ${date.toLocaleDateString("vi-VN")}`
                : dateString;

    }


    modal.classList.remove(
        "hidden"
    );

    modal.style.display =
        "flex";


    const customerName =
        document.getElementById(
            "customer-name"
        );

    if (customerName) {

        customerName.value =
            currentProfile?.full_name ||
            "";

    }


    const customerPhone =
        document.getElementById(
            "customer-phone"
        );

    if (customerPhone) {

        customerPhone.value =
            currentProfile?.phone ||
            "";

    }


    if (customerName) {

        customerName.focus();

    }

}


function closeBooking() {

    selectedBookingDay =
        null;

    const modal =
        document.getElementById(
            "booking-modal"
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );

    modal.style.display =
        "none";
}


/* =========================================
   CREATE RENTAL
========================================= */

async function createRental() {

    if (
        !currentUser
    ) {

        closeBooking();

        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );

        return;

    }


    if (
        !selectedCharacter?.id
    ) {

        showToast(
            "Không xác định được nhân vật."
        );

        return;

    }


    if (
        selectedBookingDay ===
        null
    ) {

        showToast(
            "Vui lòng chọn ngày thuê."
        );

        return;

    }


    const month =
        String(
            currentMonth + 1
        ).padStart(2, "0");

    const day =
        String(
            selectedBookingDay
        ).padStart(2, "0");

    const startDate =
        `${currentYear}-${month}-${day}`;

    const endDate =
        startDate;


    /*
       KIỂM TRA LẠI VỚI DATABASE
       ngay trước INSERT.
    */

    const availability =
        await checkRentalAvailability(
            Number(
                selectedCharacter.id
            ),
            startDate,
            endDate
        );


    if (
        availability.error
    ) {

        alert(
            "Không thể kiểm tra tình trạng ngày thuê. Vui lòng thử lại."
        );

        return;

    }


    if (
        !availability.available
    ) {

        rentedDays.add(
            startDate
        );

        renderCalendar();

        closeBooking();

        alert(
            "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
        );

        return;

    }


    /*
       LẤY THÔNG TIN KHÁCH.
    */

    const customerNameInput =
        document.getElementById(
            "customer-name"
        );

    const customerPhoneInput =
        document.getElementById(
            "customer-phone"
        );

    const noteInput =
        document.getElementById(
            "customer-note"
        );


    const customerName =
        customerNameInput?.value
            ?.trim() ||
        currentProfile?.full_name ||
        "";

    const phone =
        customerPhoneInput?.value
            ?.trim() ||
        currentProfile?.phone ||
        "";

    const note =
        noteInput?.value
            ?.trim() ||
        "";


    if (!customerName) {

        alert(
            "Vui lòng nhập họ tên."
        );

        customerNameInput?.focus();

        return;

    }


    if (!phone) {

        alert(
            "Vui lòng nhập số điện thoại."
        );

        customerPhoneInput?.focus();

        return;

    }


    /*
       DỮ LIỆU INSERT.
    */

    const rentalData = {

        character_id:
            Number(
                selectedCharacter.id
            ),

        user_id:
            currentUser.id,

        start_date:
            startDate,

        end_date:
            endDate,

        status:
            "pending"

    };


    /*
       Chỉ thêm các field nếu
       người dùng nhập.
    */

    if (customerName) {

        rentalData.customer_name =
            customerName;

    }

    if (phone) {

        rentalData.phone =
            phone;

    }

    if (note) {

        rentalData.note =
            note;

    }


    /*
       INSERT.
    */

    const {
        data,
        error
    } =
        await supabaseClient
            .from("rentals")
            .insert(
                rentalData
            )
            .select()
            .single();


    if (error) {

        console.error(
            "create rental error:",
            error
        );


        /*
           EXCLUDE constraint
           chống trùng ngày.
        */

        if (
            error.code ===
            "23P01"
        ) {

            rentedDays.add(
                startDate
            );

            renderCalendar();

            closeBooking();

            alert(
                "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
            );

            return;

        }


        /*
           Một số database constraint
           có thể trả 23505.
        */

        if (
            error.code ===
            "23505"
        ) {

            rentedDays.add(
                startDate
            );

            renderCalendar();

            closeBooking();

            alert(
                "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
            );

            return;

        }


        alert(
            "Đặt thuê thất bại: " +
            (
                error.message ||
                "Lỗi không xác định."
            )
        );

        return;

    }


    console.log(
        "Rental created:",
        data
    );


    /*
       Cập nhật giao diện ngay.
    */

    rentedDays.add(
        startDate
    );

    renderCalendar();

    closeBooking();


    const bookingForm =
        document.getElementById(
            "booking-form"
        );

    if (bookingForm) {

        bookingForm.reset();

    }


    alert(
        "Đặt thuê thành công!"
    );


    /*
       Tải lại từ database.
    */

    await loadRentedDays();

    renderCalendar();
}


/* =========================================
   BOOKING FORM
========================================= */

function setupBookingForm() {

    const form =
        document.getElementById(
            "booking-form"
        );

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );

            const originalText =
                submitButton?.textContent ||
                "Đặt thuê";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Đang xử lý...";

            }


            try {

                await createRental();

            } catch (error) {

                console.error(
                    "booking submit error:",
                    error
                );

                alert(
                    "Có lỗi xảy ra khi đặt thuê. Vui lòng thử lại."
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        originalText;

                }

            }

        }
    );
}


/* =========================================
   EVENT LISTENERS
========================================= */

function setupEventListeners() {

    /*
       LOGIN
    */

    const authForm =
        document.getElementById(
            "auth-form"
        );

    if (authForm) {

        authForm.addEventListener(
            "submit",
            handleAuthSubmit
        );

    }


    /*
       AUTH BUTTON
    */

    document
        .querySelectorAll(
            "[data-auth-login]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openAuthModal();

                    }
                );

            }
        );


    /*
       LOGOUT
    */

    document
        .querySelectorAll(
            "[data-auth-logout]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    signOutUser
                );

            }
        );


    /*
       AUTH SWITCH
    */

    const authSwitch =
        document.getElementById(
            "auth-switch"
        );

    if (authSwitch) {

        authSwitch.addEventListener(
            "click",
            toggleAuthMode
        );

    }


    /*
       AUTH CLOSE
    */

    const authClose =
        document.getElementById(
            "auth-close"
        );

    if (authClose) {

        authClose.addEventListener(
            "click",
            closeAuthModal
        );

    }


    /*
       AUTH MODAL CLICK OUTSIDE
    */

    const authModal =
        document.getElementById(
            "auth-modal"
        );

    if (authModal) {

        authModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    authModal
                ) {

                    closeAuthModal();

                }

            }
        );

    }


    /*
       BOOKING CLOSE
    */

    if (closeBookingBtn) {

        closeBookingBtn.addEventListener(
            "click",
            closeBooking
        );

    }


    const bookingClose =
        document.getElementById(
            "booking-close"
        );

    if (bookingClose) {

        bookingClose.addEventListener(
            "click",
            closeBooking
        );

    }


    /*
       BOOKING MODAL OUTSIDE
    */

    if (bookingModal) {

        bookingModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    bookingModal
                ) {

                    closeBooking();

                }

            }
        );

    }


    /*
       PREVIOUS MONTH
    */

    if (prevMonthBtn) {

        prevMonthBtn.addEventListener(
            "click",
            () => {

                previousMonth();

            }
        );

    }


    /*
       NEXT MONTH
    */

    if (nextMonthBtn) {

        nextMonthBtn.addEventListener(
            "click",
            () => {

                nextMonth();

            }
        );

    }


    /*
       Một số HTML cũ có ID khác.
    */

    const previousButton =
        document.getElementById(
            "prev-month"
        );

    if (
        previousButton &&
        previousButton !== prevMonthBtn
    ) {

        previousButton.addEventListener(
            "click",
            () => {

                previousMonth();

            }
        );

    }


    const nextButton =
        document.getElementById(
            "next-month"
        );

    if (
        nextButton &&
        nextButton !== nextMonthBtn
    ) {

        nextButton.addEventListener(
            "click",
            () => {

                nextMonth();

            }
        );

    }


    /*
       AUTH MODAL BUTTONS
       Hỗ trợ cả ID cũ và data attribute.
    */

    document
        .querySelectorAll(
            "[data-auth-open]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    openAuthModal
                );

            }
        );


    document
        .querySelectorAll(
            "[data-auth-close]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    closeAuthModal
                );

            }
        );


    /*
       BOOKING CLOSE BUTTONS
    */

    document
        .querySelectorAll(
            "[data-booking-close]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    closeBooking
                );

            }
        );

}


/* =========================================
   SEARCH
========================================= */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "search-input"
        );

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        () => {

            const keyword =
                searchInput.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    ".character-card"
                )
                .forEach(
                    card => {

                        const text =
                            card.textContent
                                .toLowerCase();

                        card.style.display =
                            !keyword ||
                            text.includes(
                                keyword
                            )
                                ? ""
                                : "none";

                    }
                );

        }
    );
}


/* =========================================
   GLOBAL CLICK SUPPORT
========================================= */

document.addEventListener(
    "click",
    event => {

        const loginButton =
            event.target.closest(
                "[data-auth-login]"
            );

        if (loginButton) {

            openAuthModal();

            return;

        }


        const logoutButton =
            event.target.closest(
                "[data-auth-logout]"
            );

        if (logoutButton) {

            signOutUser();

            return;

        }


        const authSwitch =
            event.target.closest(
                "[data-auth-switch]"
            );

        if (authSwitch) {

            toggleAuthMode();

            return;

        }


        const bookingClose =
            event.target.closest(
                "[data-booking-close]"
            );

        if (bookingClose) {

            closeBooking();

            return;

        }

    }
);


/* =========================================
   ADMIN PAGE
========================================= */

function openAdminPage() {

    window.location.href =
        "admin.html";
}


/* =========================================
   INITIALIZE
========================================= */

async function initApp() {

    try {

        setupEventListeners();

        setupBookingForm();

        setupSearch();

        await loadCharactersFromSupabase();

        await initAuth();

        /*
           Render calendar nếu HTML
           đã có lịch.
        */

        if (
            selectedCharacter
        ) {

            await loadRentedDays();

            renderCalendar();

        }

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

    }

}


initApp();
