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

const bookingDateText =
    document.getElementById(
        "booking-date"
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

    if (value === null || value === undefined) {
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

    const parts =
        String(dateString)
            .split("-")
            .map(Number);

    if (parts.length !== 3) {
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


function addDays(
    dateString,
    amount
) {

    const date =
        parseDate(dateString);

    if (!date) {
        return null;
    }

    date.setDate(
        date.getDate() + amount
    );

    return formatDate(date);
}


function datesBetween(
    startDate,
    endDate
) {

    const result = [];

    let cursor =
        parseDate(startDate);

    const end =
        parseDate(endDate);

    if (!cursor || !end) {
        return result;
    }

    while (
        cursor <= end
    ) {

        result.push(
            formatDate(cursor)
        );

        cursor.setDate(
            cursor.getDate() + 1
        );
    }

    return result;
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

    currentProfile = data;
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

        return;
    }

    characters =
        data || [];

    renderCharacters();
}


function renderCharacters() {

    if (!characterList) {
        return;
    }

    characterList.innerHTML = "";

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
}


/* =========================================
   LOAD REAL RENTAL DAYS
========================================= */

async function loadRentedDays() {

    rentedDays =
        new Set();

    if (!selectedCharacter?.id) {
        return;
    }

    /*
       Lấy các đơn thuê thực tế của nhân vật.

       pending + confirmed:
       đều được coi là đang giữ ngày để tránh
       khách khác đặt trùng trong thời gian chờ.
    */

    const {
        data,
        error
    } =
        await supabaseClient
            .from("rentals")
            .select(
                "start_date,end_date,status"
            )
            .eq(
                "character_id",
                selectedCharacter.id
            )
            .in(
                "status",
                [
                    "pending",
                    "confirmed"
                ]
            );

    if (error) {

        console.error(
            "load rented days error:",
            error
        );

        /*
           Không tự đánh dấu ngày là đã thuê
           nếu không lấy được dữ liệu.
        */

        return;
    }

    (data || []).forEach(
        rental => {

            const startDate =
                normalizeDateString(
                    rental.start_date
                );

            const endDate =
                normalizeDateString(
                    rental.end_date
                );

            if (
                !startDate ||
                !endDate
            ) {
                return;
            }

            datesBetween(
                startDate,
                endDate
            ).forEach(
                date => {

                    rentedDays.add(
                        date
                    );

                }
            );

        }
    );
}


/* =========================================
   CHECK AVAILABILITY AGAIN
   RIGHT BEFORE BOOKING
========================================= */

async function checkRentalAvailability(
    characterId,
    startDate,
    endDate
) {

    /*
       Đây là lớp kiểm tra thứ hai.

       Dù lịch trên màn hình vừa hiển thị
       "Còn trống", một khách khác có thể vừa
       đặt trước đó vài giây.

       Vì vậy phải kiểm tra lại trước INSERT.
    */

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "is_rental_date_available",
                {
                    p_character_id:
                        characterId,

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
           Nếu database chưa có RPC này,
           fallback sang truy vấn trực tiếp.
        */

        const fallback =
            await supabaseClient
                .from("rentals")
                .select(
                    "id,start_date,end_date,status"
                )
                .eq(
                    "character_id",
                    characterId
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

        if (fallback.error) {

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

            error: null
        };
    }

    return {
        available:
            data === true ||
            data?.available === true,

        error: null
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

    calendar.innerHTML = "";

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

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
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

                    openBookingModal(
                        dateString
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

async function changeMonth(
    offset
) {

    currentMonth += offset;

    if (currentMonth < 0) {

        currentMonth = 11;

        currentYear--;

    }

    if (currentMonth > 11) {

        currentMonth = 0;

        currentYear++;

    }

    /*
       Mỗi lần đổi tháng đều tải lại
       dữ liệu thật từ Supabase.
    */

    await loadRentedDays();

    renderCalendar();
}


if (prevMonthBtn) {

    prevMonthBtn.addEventListener(
        "click",
        () => {

            changeMonth(-1);

        }
    );

}


if (nextMonthBtn) {

    nextMonthBtn.addEventListener(
        "click",
        () => {

            changeMonth(1);

        }
    );

}


/* =========================================
   BOOKING MODAL
========================================= */

function openBookingModal(
    dateString
) {

    /*
       Kiểm tra lần nữa ở client trước
       khi mở form.
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

    selectedBookingDay =
        dateString;

    if (bookingDateText) {

        const date =
            parseDate(
                dateString
            );

        bookingDateText.textContent =
            date
                ? date.toLocaleDateString(
                    "vi-VN"
                )
                : dateString;

    }

    if (bookingModal) {

        bookingModal.classList.add(
            "active"
        );

        bookingModal.style.display =
            "flex";

    }
}


function closeBookingModal() {

    selectedBookingDay =
        null;

    if (bookingModal) {

        bookingModal.classList.remove(
            "active"
        );

        bookingModal.style.display =
            "none";

    }
}


if (closeBookingBtn) {

    closeBookingBtn.addEventListener(
        "click",
        closeBookingModal
    );

}


if (bookingModal) {

    bookingModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                bookingModal
            ) {

                closeBookingModal();

            }

        }
    );

}


/* =========================================
   CREATE RENTAL
========================================= */

async function createRental(
    form
) {

    if (!selectedCharacter?.id) {

        alert(
            "Vui lòng chọn nhân vật."
        );

        return;
    }

    if (!selectedBookingDay) {

        alert(
            "Vui lòng chọn ngày thuê."
        );

        return;
    }

    /*
       Bắt buộc đăng nhập.
    */

    if (!currentUser) {

        alert(
            "Vui lòng đăng nhập trước khi đặt thuê."
        );

        return;
    }

    /*
       Hiện tại giao diện chọn một ngày.
       start_date = end_date.
    */

    const startDate =
        selectedBookingDay;

    const endDate =
        selectedBookingDay;

    /*
       KIỂM TRA LẦN CUỐI VỚI DATABASE
       trước khi INSERT.
    */

    const availability =
        await checkRentalAvailability(
            selectedCharacter.id,
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

        /*
           Có người vừa đặt trong lúc
           khách đang mở form.
        */

        rentedDays.add(
            selectedBookingDay
        );

        renderCalendar();

        closeBookingModal();

        alert(
            "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
        );

        return;
    }

    /*
       Lấy dữ liệu form.
    */

    const formData =
        new FormData(form);

    const rentalData = {

        character_id:
            selectedCharacter.id,

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
       Copy các field có trong form
       nếu database đang sử dụng chúng.
    */

    const customerName =
        formData.get(
            "customer_name"
        );

    const phone =
        formData.get(
            "phone"
        );

    const note =
        formData.get(
            "note"
        );

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
           Database có thể từ chối vì
           một khách khác vừa đặt cùng ngày.
        */

        if (
            error.code ===
            "23P01" ||
            error.code ===
            "23505"
        ) {

            rentedDays.add(
                selectedBookingDay
            );

            renderCalendar();

            closeBookingModal();

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
       Cập nhật giao diện ngay lập tức.
    */

    rentedDays.add(
        selectedBookingDay
    );

    renderCalendar();

    closeBookingModal();

    if (form) {
        form.reset();
    }

    alert(
        "Đặt thuê thành công!"
    );

    /*
       Tải lại dữ liệu từ database để đảm bảo
       giao diện phản ánh đúng trạng thái server.
    */

    await loadRentedDays();

    renderCalendar();
}


/* =========================================
   BOOKING FORM SUBMIT
========================================= */

if (bookingForm) {

    bookingForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const submitButton =
                bookingForm.querySelector(
                    'button[type="submit"]'
                );

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.dataset.originalText =
                    submitButton.textContent;

                submitButton.textContent =
                    "Đang xử lý...";

            }

            try {

                await createRental(
                    bookingForm
                );

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
                        submitButton.dataset.originalText ||
                        "Đặt thuê";

                }

            }

        }
    );

}


/* =========================================
   AUTH BUTTONS
========================================= */

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


/* =========================================
   SUPABASE AUTH STATE
========================================= */

supabaseClient
    .auth
    .onAuthStateChange(
        async (
            event,
            session
        ) => {

            currentUser =
                session?.user || null;

            await loadCurrentProfile();

            updateAuthUI();

        }
    );


/* =========================================
   INITIALIZATION
========================================= */

async function init() {

    try {

        await refreshAuthState();

        await loadCharacters();

        /*
           Nếu đã có nhân vật được chọn
           thì tải lịch thật.
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


init();
