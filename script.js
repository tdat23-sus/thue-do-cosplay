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


/* =========================================
   GLOBAL STATE
========================================= */

let currentUser = null;
let currentProfile = null;

let authMode = "login";

let pendingBookingDay = null;


/* =========================================
   AUTH MODAL
========================================= */

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

        const emailInput =
            document.getElementById("auth-email");

        if (emailInput) {
            emailInput.focus();
        }

    }, 50);
}


function closeAuthModal() {

    const modal =
        document.getElementById("auth-modal");

    if (!modal) return;

    modal.classList.add("hidden");

    const message =
        document.getElementById("auth-message");

    if (message) {
        message.textContent = "";
    }
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

    const register =
        mode === "register";


    const title =
        document.getElementById("auth-title");

    const submit =
        document.getElementById("auth-submit");

    const nameLabel =
        document.getElementById("auth-name-label");

    const switchText =
        document.getElementById("auth-switch-text");

    const switchButton =
        document.getElementById("auth-switch");


    if (title) {

        title.textContent =
            register
                ? "Tạo tài khoản"
                : "Đăng nhập";
    }


    if (submit) {

        submit.textContent =
            register
                ? "Đăng ký"
                : "Đăng nhập";
    }


    if (nameLabel) {

        nameLabel.classList.toggle(
            "hidden",
            !register
        );
    }


    if (switchText) {

        switchText.textContent =
            register
                ? "Đã có tài khoản?"
                : "Chưa có tài khoản?";
    }


    if (switchButton) {

        switchButton.textContent =
            register
                ? "Đăng nhập"
                : "Đăng ký";
    }
}


/* =========================================
   AUTH SUBMIT
========================================= */

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


    const email =
        emailInput?.value.trim() || "";

    const password =
        passwordInput?.value || "";

    const name =
        nameInput?.value.trim() || "";


    if (!email || !password) {

        showAuthError(
            "Vui lòng nhập email và mật khẩu."
        );

        return;
    }


    if (
        authMode === "register" &&
        !name
    ) {

        showAuthError(
            "Vui lòng nhập họ và tên."
        );

        return;
    }


    if (password.length < 6) {

        showAuthError(
            "Mật khẩu phải có ít nhất 6 ký tự."
        );

        return;
    }


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Đang xử lý...";
    }


    clearAuthError();


    try {

        /* =========================
           REGISTER
        ========================= */

        if (authMode === "register") {

            const {
                data,
                error
            } =
                await supabaseClient.auth.signUp({

                    email,

                    password,

                    options: {

                        data: {
                            full_name: name
                        }

                    }

                });


            if (error) {
                throw error;
            }


            /*
             * Supabase có thể yêu cầu
             * xác nhận email trước khi đăng nhập.
             */

            if (data?.session) {

                await loadCurrentProfile(
                    data.user
                );

                showToast(
                    "Tạo tài khoản thành công!"
                );

                closeAuthModal();

            } else {

                showToast(
                    "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản."
                );

                closeAuthModal();
            }

        }


        /* =========================
           LOGIN
        ========================= */

        else {

            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .signInWithPassword({

                        email,

                        password

                    });


            if (error) {
                throw error;
            }


            await loadCurrentProfile(
                data.user
            );


            closeAuthModal();


            showToast(
                "Đăng nhập thành công!"
            );


            /*
             * Nếu người dùng đã chọn
             * ngày thuê trước khi login,
             * mở lại form thuê.
             */

            if (
                pendingBookingDay !== null
            ) {

                const day =
                    pendingBookingDay;


                pendingBookingDay =
                    null;


                setTimeout(() => {

                    openBooking(day);

                }, 200);

            }

        }


    } catch (error) {

        console.error(
            "AUTH ERROR:",
            error
        );


        showAuthError(
            translateAuthError(
                error?.message
            )
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                authMode === "register"
                    ? "Đăng ký"
                    : "Đăng nhập";
        }
    }
}


/* =========================================
   AUTH ERROR
========================================= */

function showAuthError(message) {

    const element =
        document.getElementById(
            "auth-message"
        );

    if (element) {

        element.textContent =
            message || "Có lỗi xảy ra.";

    }
}


function clearAuthError() {

    const element =
        document.getElementById(
            "auth-message"
        );

    if (element) {
        element.textContent = "";
    }
}


function translateAuthError(message) {

    if (!message) {
        return "Có lỗi xảy ra.";
    }


    const text =
        message.toLowerCase();


    if (
        text.includes(
            "invalid login credentials"
        )
    ) {

        return "Email hoặc mật khẩu không đúng.";
    }


    if (
        text.includes(
            "user already registered"
        )
    ) {

        return "Email này đã được đăng ký.";
    }


    if (
        text.includes(
            "password should be at least"
        )
    ) {

        return "Mật khẩu phải có ít nhất 6 ký tự.";
    }


    if (
        text.includes(
            "email not confirmed"
        )
    ) {

        return "Email chưa được xác nhận.";
    }


    if (
        text.includes(
            "email rate limit"
        )
    ) {

        return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
    }


    return message;
}


/* =========================================
   LOGOUT
========================================= */

async function signOutUser() {

    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {
            throw error;
        }


        currentUser = null;

        currentProfile = null;

        pendingBookingDay = null;


        updateAuthUI();


        showToast(
            "Đã đăng xuất."
        );


    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );


        showToast(
            "Không thể đăng xuất."
        );
    }
}


/* =========================================
   LOAD PROFILE
========================================= */

async function loadCurrentProfile(user) {

    currentUser =
        user || null;

    currentProfile =
        null;


    if (!user) {

        updateAuthUI();

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, full_name, phone, avatar_url, role"
                )
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();


        if (error) {

            console.error(
                "PROFILE ERROR:",
                error
            );

        } else {

            currentProfile =
                data || null;
        }


    } catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );
    }


    updateAuthUI();
}


/* =========================================
   UPDATE AUTH UI
========================================= */

function updateAuthUI() {

    const button =
        document.getElementById(
            "auth-button"
        );


    const userBox =
        document.getElementById(
            "auth-user"
        );


    const nameElement =
        document.getElementById(
            "auth-user-name"
        );


    const roleElement =
        document.getElementById(
            "auth-user-role"
        );


    const adminButton =
        document.getElementById(
            "admin-button"
        );


    if (!button || !userBox) {
        return;
    }


    /* =========================
       NOT LOGGED IN
    ========================= */

    if (!currentUser) {

        button.style.display =
            "inline-block";

        userBox.style.display =
            "none";


        if (adminButton) {

            adminButton.style.display =
                "none";
        }


        return;
    }


    /* =========================
       LOGGED IN
    ========================= */

    button.style.display =
        "none";

    userBox.style.display =
        "flex";


    if (nameElement) {

        nameElement.textContent =
            currentProfile?.full_name ||
            currentUser.email ||
            "Tài khoản";
    }


    const isAdmin =
        currentProfile?.role === "admin";


    if (roleElement) {

        roleElement.textContent =
            isAdmin
                ? "ADMIN"
                : "KHÁCH";

        roleElement.style.display =
            "inline-block";
    }


    if (adminButton) {

        adminButton.style.display =
            isAdmin
                ? "inline-block"
                : "none";
    }
}


/* =========================================
   AUTH STATE LISTENER
========================================= */

supabaseClient
    .auth
    .onAuthStateChange(
        (_event, session) => {

            /*
             * Không gọi quá nhiều thao tác
             * Supabase ngay bên trong callback.
             */

            setTimeout(() => {

                loadCurrentProfile(
                    session?.user || null
                );

            }, 0);

        }
    );


/* =========================================
   INIT AUTH
========================================= */

async function initAuth() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .getSession();


        if (error) {
            throw error;
        }


        await loadCurrentProfile(
            data?.session?.user || null
        );


    } catch (error) {

        console.error(
            "SESSION ERROR:",
            error
        );


        currentUser = null;

        currentProfile = null;

        updateAuthUI();
    }
}


/* =========================================
   CHARACTER DATA
========================================= */

const characters = [

    {
        id: "hutao",

        name: "Hu Tao",

        category: "Genshin Impact",

        price: "250.000đ / ngày",

        description:
            "Bộ cosplay Hu Tao với trang phục và phụ kiện cơ bản.",

        image:
            "https://placehold.co/700x900/e8dce5/332b33?text=HU+TAO",

        items: [
            "Trang phục Hu Tao",
            "Tóc giả",
            "Phụ kiện",
            "Các chi tiết đi kèm"
        ],

        rentedDays: [
            5,
            12,
            18,
            19,
            25
        ]
    },


    {
        id: "furina",

        name: "Furina",

        category: "Genshin Impact",

        price: "300.000đ / ngày",

        description:
            "Bộ cosplay Furina phong cách Fontaine.",

        image:
            "https://placehold.co/700x900/dce7f0/28313b?text=FURINA",

        items: [
            "Trang phục Furina",
            "Tóc giả",
            "Phụ kiện",
            "Trang sức"
        ],

        rentedDays: [
            3,
            4,
            15,
            22
        ]
    },


    {
        id: "miku",

        name: "Hatsune Miku",

        category: "Vocaloid",

        price: "200.000đ / ngày",

        description:
            "Bộ cosplay Hatsune Miku với tóc giả và phụ kiện.",

        image:
            "https://placehold.co/700x900/dcefeb/263634?text=MIKU",

        items: [
            "Trang phục",
            "Tóc giả xanh",
            "Phụ kiện",
            "Cà vạt"
        ],

        rentedDays: [
            7,
            8,
            20
        ]
    },


    {
        id: "kafka",

        name: "Kafka",

        category: "Honkai: Star Rail",

        price: "300.000đ / ngày",

        description:
            "Bộ cosplay Kafka phong cách Honkai: Star Rail.",

        image:
            "https://placehold.co/700x900/e9dce1/352c30?text=KAFKA",

        items: [
            "Trang phục Kafka",
            "Tóc giả",
            "Kính",
            "Phụ kiện"
        ],

        rentedDays: [
            2,
            10,
            11,
            27
        ]
    },


    {
        id: "raiden",

        name: "Raiden Shogun",

        category: "Genshin Impact",

        price: "280.000đ / ngày",

        description:
            "Bộ cosplay Raiden Shogun với trang phục và phụ kiện.",

        image:
            "https://placehold.co/700x900/e2dff0/302d3d?text=RAIDEN",

        items: [
            "Trang phục",
            "Tóc giả",
            "Phụ kiện",
            "Đạo cụ"
        ],

        rentedDays: [
            6,
            14,
            21,
            28
        ]
    },


    {
        id: "navia",

        name: "Navia",

        category: "Genshin Impact",

        price: "280.000đ / ngày",

        description:
            "Bộ cosplay Navia phong cách Fontaine.",

        image:
            "https://placehold.co/700x900/f0e2cf/3b3328?text=NAVIA",

        items: [
            "Trang phục Navia",
            "Tóc giả",
            "Mũ",
            "Phụ kiện"
        ],

        rentedDays: [
            9,
            16,
            23
        ]
    }

];


/* =========================================
   STATE
========================================= */

let selectedCharacter = null;


/*
 * Tự động mở tháng hiện tại.
 *
 * JavaScript:
 * January = 0
 * September = 8
 */

const now =
    new Date();

let currentMonth =
    now.getMonth();

let currentYear =
    now.getFullYear();


/* =========================================
   ELEMENTS
========================================= */

const characterList =
    document.getElementById(
        "character-list"
    );


const characterCount =
    document.getElementById(
        "character-count"
    );


const homePage =
    document.getElementById(
        "home-page"
    );


const characterPage =
    document.getElementById(
        "character-page"
    );


/* =========================================
   SHOW CHARACTERS
========================================= */

function showCharacters(
    list = characters
) {

    if (!characterList) {
        return;
    }


    characterList.innerHTML =
        "";


    if (characterCount) {

        characterCount.textContent =
            `${list.length} nhân vật`;
    }


    if (list.length === 0) {

        characterList.innerHTML = `

            <p
                style="
                    grid-column:1/-1;
                    color:#888;
                "
            >
                Không tìm thấy nhân vật.
            </p>

        `;

        return;
    }


    list.forEach(
        character => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "character-card";


            card.innerHTML = `

                <img
                    class="character-card-image"
                    src="${character.image}"
                    alt="${character.name}"
                    loading="lazy"
                >

                <div
                    class="character-card-info"
                >

                    <div
                        class="character-card-category"
                    >
                        ${character.category}
                    </div>

                    <h3
                        class="character-card-name"
                    >
                        ${character.name}
                    </h3>

                    <div
                        class="character-card-price"
                    >
                        ${character.price}
                    </div>

                </div>

            `;


            card.addEventListener(
                "click",
                () => {

                    openCharacter(
                        character.id
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
   OPEN CHARACTER
========================================= */

function openCharacter(id) {

    const character =
        characters.find(
            item => item.id === id
        );


    if (!character) {
        return;
    }


    selectedCharacter =
        character;


    if (homePage) {

        homePage.classList.add(
            "hidden"
        );
    }


    if (characterPage) {

        characterPage.classList.remove(
            "hidden"
        );
    }


    const image =
        document.getElementById(
            "detail-image"
        );


    if (image) {

        image.src =
            character.image;

        image.alt =
            character.name;
    }


    const category =
        document.getElementById(
            "detail-category"
        );


    if (category) {

        category.textContent =
            character.category;
    }


    const name =
        document.getElementById(
            "detail-name"
        );


    if (name) {

        name.textContent =
            character.name;
    }


    const description =
        document.getElementById(
            "detail-description"
        );


    if (description) {

        description.textContent =
            character.description;
    }


    const price =
        document.getElementById(
            "detail-price"
        );


    if (price) {

        price.textContent =
            character.price;
    }


    const items =
        document.getElementById(
            "detail-items"
        );


    if (items) {

        items.innerHTML = "";


        character.items.forEach(
            item => {

                const li =
                    document.createElement(
                        "li"
                    );


                li.textContent =
                    item;


                items.appendChild(
                    li
                );

            }
        );
    }


    renderCalendar();


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });
}


/* =========================================
   HOME
========================================= */

function goHome() {

    if (characterPage) {

        characterPage.classList.add(
            "hidden"
        );
    }


    if (homePage) {

        homePage.classList.remove(
            "hidden"
        );
    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });
}


/* =========================================
   SEARCH
========================================= */

function searchCharacters() {

    const input =
        document.getElementById(
            "search-input"
        );


    if (!input) {
        return;
    }


    const keyword =
        input.value
            .toLowerCase()
            .trim();


    const result =
        characters.filter(
            character => {

                return (
                    character.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    character.category
                        .toLowerCase()
                        .includes(keyword)
                );

            }
        );


    showCharacters(result);
}


/* =========================================
   CALENDAR
========================================= */

function renderCalendar() {

    if (!selectedCharacter) {
        return;
    }


    const calendar =
        document.getElementById(
            "calendar"
        );


    const monthTitle =
        document.getElementById(
            "month-title"
        );


    if (!calendar || !monthTitle) {
        return;
    }


    const monthNames = [

        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12"

    ];


    monthTitle.textContent =
        `${monthNames[currentMonth]} ${currentYear}`;


    calendar.innerHTML =
        "";


    const weekdays = [

        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "CN"

    ];


    weekdays.forEach(
        day => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "calendar-weekday";


            element.textContent =
                day;


            calendar.appendChild(
                element
            );

        }
    );


    /*
     * JavaScript:
     *
     * Sunday = 0
     *
     * Chuyển thành:
     *
     * Monday = 0
     */

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


    for (
        let i = 0;
        i < mondayIndex;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "calendar-empty";


        calendar.appendChild(
            empty
        );
    }


    const daysInMonth =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const element =
            document.createElement(
                "div"
            );


        const rented =
            selectedCharacter.rentedDays
                .includes(day);


        element.className =
            `calendar-day ${
                rented
                    ? "rented"
                    : "available"
            }`;


        element.innerHTML = `

            <div
                class="calendar-day-number"
            >
                ${day}
            </div>

            <span
                class="day-status"
            >
                ${
                    rented
                        ? "Đã thuê"
                        : "Còn trống"
                }
            </span>

        `;


        /*
         * Chỉ cho click ngày
         * còn trống.
         */

        if (!rented) {

            element.addEventListener(
                "click",
                () => {

                    openBooking(day);

                }
            );

        }


        calendar.appendChild(
            element
        );
    }
}


/* =========================================
   MONTH NAVIGATION
========================================= */

function previousMonth() {

    currentMonth--;


    if (currentMonth < 0) {

        currentMonth = 11;

        currentYear--;
    }


    renderCalendar();
}


function nextMonth() {

    currentMonth++;


    if (currentMonth > 11) {

        currentMonth = 0;

        currentYear++;
    }


    renderCalendar();
}


/* =========================================
   BOOKING
========================================= */

function openBooking(day) {

    if (!selectedCharacter) {

        showToast(
            "Vui lòng chọn nhân vật trước."
        );

        return;
    }


    /*
     * Nếu chưa đăng nhập,
     * lưu lại ngày người dùng chọn.
     */

    if (!currentUser) {

        pendingBookingDay =
            day;


        openAuthModal(
            "Bạn cần đăng nhập để gửi yêu cầu thuê."
        );


        return;
    }


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
            `Thuê ${selectedCharacter.name}`;
    }


    const bookingDate =
        document.getElementById(
            "booking-date"
        );


    if (bookingDate) {

        bookingDate.textContent =
            `Ngày ${day}/${currentMonth + 1}/${currentYear}`;
    }


    modal.classList.remove(
        "hidden"
    );


    const customerName =
        document.getElementById(
            "customer-name"
        );


    const customerPhone =
        document.getElementById(
            "customer-phone"
        );


    if (customerName) {

        customerName.value =
            currentProfile?.full_name || "";
    }


    if (customerPhone) {

        customerPhone.value =
            currentProfile?.phone || "";
    }


    setTimeout(() => {

        if (customerName) {
            customerName.focus();
        }

    }, 100);
}


/* =========================================
   CLOSE BOOKING
========================================= */

function closeBooking() {

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
}


/* =========================================
   SUBMIT BOOKING
========================================= */

function submitBooking(event) {

    event.preventDefault();


    if (!currentUser) {

        closeBooking();


        pendingBookingDay =
            null;


        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );


        return;
    }


    if (!selectedCharacter) {

        showToast(
            "Không xác định được nhân vật."
        );

        return;
    }


    const name =
        document
            .getElementById(
                "customer-name"
            )
            ?.value
            .trim() || "";


    const phone =
        document
            .getElementById(
                "customer-phone"
            )
            ?.value
            .trim() || "";


    const note =
        document
            .getElementById(
                "customer-note"
            )
            ?.value
            .trim() || "";


    if (!name) {

        showToast(
            "Vui lòng nhập họ và tên."
        );

        return;
    }


    if (!phone) {

        showToast(
            "Vui lòng nhập số điện thoại."
        );

        return;
    }


    /*
     * Tạo dữ liệu đơn thuê.
     *
     * Hiện tại chưa INSERT vào Supabase
     * vì cần biết chính xác schema bảng rentals.
     */

    const bookingData = {

        user_id:
            currentUser.id,

        character_id:
            selectedCharacter.id,

        character_name:
            selectedCharacter.name,

        rental_date:
            `${currentYear}-${String(
                currentMonth + 1
            ).padStart(2, "0")}-${String(
                pendingBookingDay || getCurrentBookingDay()
            ).padStart(2, "0")}`,

        customer_name:
            name,

        customer_phone:
            phone,

        note:
            note

    };


    console.log(
        "BOOKING DATA:",
        bookingData
    );


    /*
     * TODO:
     *
     * Khi xác định chính xác cấu trúc
     * bảng rentals trong Supabase,
     * thay phần trên bằng:
     *
     * await supabaseClient
     *     .from("rentals")
     *     .insert([bookingData]);
     */


    closeBooking();


    showToast(
        "Đã nhận thông tin yêu cầu thuê!"
    );


    const form =
        event.target;


    if (form) {
        form.reset();
    }


    pendingBookingDay =
        null;
}


/*
 * Khi submit trực tiếp mà không còn
 * pendingBookingDay, lấy ngày hiện tại.
 */

function getCurrentBookingDay() {

    return new Date().getDate();
}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        showToast.timeout
    );


    showToast.timeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);
}


/* =========================================
   SEARCH BUTTON
========================================= */

function focusSearch() {

    goHome();


    setTimeout(() => {

        const searchInput =
            document.getElementById(
                "search-input"
            );


        if (searchInput) {

            searchInput.focus();

            searchInput.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

    }, 150);
}


/* =========================================
   CLOSE AUTH WHEN CLICK OUTSIDE
========================================= */

document
    .getElementById("auth-modal")
    ?.addEventListener(
        "click",
        (event) => {

            /*
             * Chỉ đóng khi click vào
             * vùng modal bên ngoài.
             */

            if (
                event.target.id ===
                "auth-modal"
            ) {

                closeAuthModal();
            }

        }
    );


/* =========================================
   ESC KEY
========================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key !== "Escape") {
            return;
        }


        const authModal =
            document.getElementById(
                "auth-modal"
            );


        const bookingModal =
            document.getElementById(
                "booking-modal"
            );


        if (
            authModal &&
            !authModal.classList.contains(
                "hidden"
            )
        ) {

            closeAuthModal();

            return;
        }


        if (
            bookingModal &&
            !bookingModal.classList.contains(
                "hidden"
            )
        ) {

            closeBooking();
        }

    }
);


/* =========================================
   ADMIN
========================================= */

function openAdminPage() {

    /*
     * Kiểm tra thêm ở phía client
     * trước khi chuyển trang.
     */

    if (
        !currentUser ||
        currentProfile?.role !== "admin"
    ) {

        showToast(
            "Bạn không có quyền truy cập."
        );

        return;
    }


    window.location.href =
        "admin.html";
}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        showCharacters();

        updateAuthUI();

        await initAuth();

    }
);
