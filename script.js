/* =========================================================
   CHIYOO SHOP
   SCRIPT.JS - FULL VERSION
   =========================================================

   Chức năng:
   - Supabase Auth
   - Đăng ký / đăng nhập / đăng xuất
   - Profile
   - Kiểm tra Admin
   - Load sản phẩm từ bảng characters
   - Tìm kiếm sản phẩm
   - Trang chi tiết nhân vật
   - Lịch thuê
   - Modal đặt thuê
   - Toast notification

   QUAN TRỌNG:
   Shop không còn dùng danh sách character hardcode.
   Dữ liệu sản phẩm lấy trực tiếp từ:

       Supabase -> characters

   Admin:
       thêm / xóa / ẩn / hiện

   Shop:
       chỉ hiển thị sản phẩm có is_active = true
   ========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://rydkgmtlmhjftbwukzdn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_wIOEpyFJLjH_aWSwnUIF-g_WCvEUOot";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================================================
   GLOBAL AUTH STATE
========================================================= */

let currentUser = null;

let currentProfile = null;

let authMode = "login";

let pendingBookingDay = null;


/* =========================================================
   CHARACTER STATE
========================================================= */

/*
   Đây là dữ liệu sản phẩm của Shop.

   Không còn hardcode nhân vật ở đây.

   Dữ liệu sẽ được load từ:

       Supabase -> characters
*/

let characters = [];


/*
   Nhân vật hiện tại đang được xem.
*/

let selectedCharacter = null;


/*
   Lịch mặc định.

   JavaScript:
   tháng 0 = tháng 1
   tháng 8 = tháng 9
*/

let currentMonth = 8;

let currentYear = 2026;


/* =========================================================
   DOM ELEMENTS
========================================================= */

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


/* =========================================================
   UTILITY
========================================================= */

/*
   Escape HTML để dữ liệu từ Supabase
   không phá giao diện HTML.
*/

function escapeHTML(value) {

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


/*
   Chuẩn hóa danh sách phụ kiện.
*/

function normalizeItems(value) {

    if (Array.isArray(value)) {

        return value
            .map(item => String(item).trim())
            .filter(Boolean);

    }


    if (typeof value === "string") {

        const text = value.trim();


        if (!text) {
            return [];
        }


        /*
           Trường hợp Supabase trả về JSON string:

           ["Tóc giả","Trang phục"]
        */

        try {

            const parsed =
                JSON.parse(text);

            if (Array.isArray(parsed)) {

                return parsed
                    .map(item => String(item).trim())
                    .filter(Boolean);

            }

        } catch (error) {

            /*
               Không phải JSON.
               Xử lý như text bình thường.
            */

        }


        /*
           Cho phép nhập:

           Tóc giả
           Trang phục
           Phụ kiện

           hoặc:

           Tóc giả, Trang phục, Phụ kiện
        */

        return text
            .split(/\r?\n|,/)
            .map(item => item.trim())
            .filter(Boolean);
    }


    return [];
}


/*
   Chuẩn hóa giá.

   DB:
       price_per_day = number

   Shop:
       250.000đ / ngày
*/

function formatPrice(price) {

    const number =
        Number(price);


    if (!Number.isFinite(number)) {

        return "Liên hệ";
    }


    return (
        new Intl.NumberFormat(
            "vi-VN"
        ).format(number)
        + "đ / ngày"
    );
}


/* =========================================================
   AUTH MODAL
========================================================= */

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


    const messageElement =
        document.getElementById(
            "auth-message"
        );


    if (messageElement) {

        messageElement.textContent =
            message;
    }


    modal.classList.remove(
        "hidden"
    );


    setAuthMode(authMode);


    setTimeout(() => {

        document
            .getElementById(
                "auth-email"
            )
            ?.focus();

    }, 50);
}


/* =========================================================
   CLOSE AUTH MODAL
========================================================= */

function closeAuthModal() {

    document
        .getElementById(
            "auth-modal"
        )
        ?.classList.add(
            "hidden"
        );
}


/* =========================================================
   TOGGLE LOGIN / REGISTER
========================================================= */

function toggleAuthMode() {

    setAuthMode(
        authMode === "login"
            ? "register"
            : "login"
    );
}


/* =========================================================
   SET AUTH MODE
========================================================= */

function setAuthMode(mode) {

    authMode = mode;


    const register =
        mode === "register";


    const title =
        document.getElementById(
            "auth-title"
        );


    const submit =
        document.getElementById(
            "auth-submit"
        );


    const nameLabel =
        document.getElementById(
            "auth-name-label"
        );


    const switchText =
        document.getElementById(
            "auth-switch-text"
        );


    const switchButton =
        document.getElementById(
            "auth-switch"
        );


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


/* =========================================================
   AUTH SUBMIT
========================================================= */

async function handleAuthSubmit(event) {

    event.preventDefault();


    const email =
        document
            .getElementById(
                "auth-email"
            )
            ?.value
            .trim();


    const password =
        document
            .getElementById(
                "auth-password"
            )
            ?.value;


    const name =
        document
            .getElementById(
                "auth-name"
            )
            ?.value
            .trim();


    const submitButton =
        document.getElementById(
            "auth-submit"
        );


    if (!email || !password) {

        document
            .getElementById(
                "auth-message"
            )
            .textContent =
            "Vui lòng nhập email và mật khẩu.";

        return;
    }


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Đang xử lý...";
    }


    try {

        /* =================================================
           REGISTER
        ================================================= */

        if (authMode === "register") {

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
                                    name || ""

                            }

                        }

                    });


            if (error) {

                throw error;
            }


            if (data.session) {

                showToast(
                    "Tạo tài khoản thành công!"
                );

            } else {

                showToast(
                    "Đăng ký thành công. Kiểm tra email nếu Supabase yêu cầu xác nhận."
                );
            }


            closeAuthModal();

        }


        /* =================================================
           LOGIN
        ================================================= */

        else {

            const {
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


            closeAuthModal();


            showToast(
                "Đăng nhập thành công!"
            );


            /*
               Nếu khách click ngày thuê
               trước khi đăng nhập,
               mở lại booking sau khi login.
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

                }, 150);
            }
        }


    } catch (error) {

        console.error(
            "AUTH ERROR:",
            error
        );


        const messageElement =
            document.getElementById(
                "auth-message"
            );


        if (messageElement) {

            messageElement.textContent =
                translateAuthError(
                    error.message
                );
        }

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


/* =========================================================
   AUTH ERROR TRANSLATION
========================================================= */

function translateAuthError(
    message
) {

    if (!message) {

        return "Có lỗi xảy ra.";
    }


    if (
        message.includes(
            "Invalid login credentials"
        )
    ) {

        return "Email hoặc mật khẩu không đúng.";
    }


    if (
        message.includes(
            "User already registered"
        )
    ) {

        return "Email này đã được đăng ký.";
    }


    if (
        message.includes(
            "Password should be at least"
        )
    ) {

        return "Mật khẩu phải có ít nhất 6 ký tự.";
    }


    if (
        message.includes(
            "Email not confirmed"
        )
    ) {

        return "Email chưa được xác nhận.";
    }


    return message;
}


/* =========================================================
   LOGOUT
========================================================= */

async function signOutUser() {

    const {
        error
    } =
        await supabaseClient
            .auth
            .signOut();


    if (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );


        showToast(
            "Không thể đăng xuất."
        );


        return;
    }


    showToast(
        "Đã đăng xuất."
    );
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadCurrentProfile(
    user
) {

    currentUser =
        user || null;


    currentProfile =
        null;


    if (!user) {

        updateAuthUI();

        return;
    }


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
            data;
    }


    updateAuthUI();
}


/* =========================================================
   UPDATE AUTH UI
========================================================= */

function updateAuthUI() {

    const button =
        document.getElementById(
            "auth-button"
        );


    const userBox =
        document.getElementById(
            "auth-user"
        );


    const name =
        document.getElementById(
            "auth-user-name"
        );


    const role =
        document.getElementById(
            "auth-user-role"
        );


    if (!button || !userBox) {

        return;
    }


    /* =====================================================
       NOT LOGGED IN
    ===================================================== */

    if (!currentUser) {

        button.style.display =
            "inline-block";


        userBox.style.display =
            "none";


        const adminButton =
            document.getElementById(
                "admin-button"
            );


        if (adminButton) {

            adminButton.style.display =
                "none";
        }


        return;
    }


    /* =====================================================
       LOGGED IN
    ===================================================== */

    button.style.display =
        "none";


    userBox.style.display =
        "flex";


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
            isAdmin
                ? "ADMIN"
                : "KHÁCH";


        role.style.display =
            "inline-block";
    }


    const adminButton =
        document.getElementById(
            "admin-button"
        );


    if (adminButton) {

        adminButton.style.display =
            isAdmin
                ? "inline-block"
                : "none";
    }
}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

supabaseClient
    .auth
    .onAuthStateChange(
        (_event, session) => {

            /*
               Không gọi trực tiếp quá sâu
               bên trong auth callback.
            */

            setTimeout(() => {

                loadCurrentProfile(
                    session?.user || null
                );

            }, 0);
        }
    );


/* =========================================================
   INIT AUTH
========================================================= */

async function initAuth() {

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getSession();


    if (error) {

        console.error(
            "SESSION ERROR:",
            error
        );


        return;
    }


    await loadCurrentProfile(
        data.session?.user || null
    );
}


/* =========================================================
   LOAD CHARACTERS FROM SUPABASE
========================================================= */

/*
   Đây là phần QUAN TRỌNG NHẤT của bản mới.

   Shop lấy sản phẩm từ:

       characters

   Chỉ lấy:

       is_active = true

   Vì vậy:

   Admin thêm
       ↓
   characters
       ↓
   Shop hiển thị

   Admin xóa
       ↓
   characters bị xóa
       ↓
   Shop không còn sản phẩm

   Admin ẩn
       ↓
   is_active = false
       ↓
   Shop không hiển thị
*/

async function loadCharactersFromSupabase() {

    if (!characterList) {

        console.error(
            "Không tìm thấy #character-list"
        );

        return;
    }


    characterList.innerHTML = `

        <div
            style="
                grid-column:1/-1;
                text-align:center;
                padding:40px 20px;
                color:#888;
            "
        >
            Đang tải sản phẩm...
        </div>

    `;


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("characters")
                .select(`
                    id,
                    name,
                    category,
                    description,
                    price_per_day,
                    image_url,
                    included_items,
                    is_active,
                    created_at
                `)
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            throw error;
        }


        /*
           Chuyển dữ liệu Supabase
           sang format mà giao diện
           hiện tại đang sử dụng.
        */

        characters =
            (data || []).map(
                character => {

                    return {

                        id:
                            character.id,

                        name:
                            character.name ||
                            "Chưa đặt tên",

                        category:
                            character.category ||
                            "Khác",

                        price:
                            formatPrice(
                                character.price_per_day
                            ),

                        priceValue:
                            Number(
                                character.price_per_day ||
                                0
                            ),

                        description:
                            character.description ||
                            "Chưa có mô tả.",

                        image:
                            character.image_url ||
                            "https://placehold.co/700x900/e8dce5/332b33?text=CHIYOO",

                        items:
                            normalizeItems(
                                character.included_items
                            ),

                        /*
                           rentedDays hiện tại
                           chưa lấy từ DB.

                           Để [] để tránh crash
                           calendar.
                        */

                        rentedDays: []

                    };

                }
            );


        console.log(
            "CHARACTERS LOADED:",
            characters
        );


        showCharacters(
            characters
        );


    } catch (error) {

        console.error(
            "LOAD CHARACTERS ERROR:",
            error
        );


        characters = [];


        characterCount.textContent =
            "0 nhân vật";


        characterList.innerHTML = `

            <div
                style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:40px 20px;
                "
            >

                <p
                    style="
                        color:#c44;
                        margin-bottom:10px;
                    "
                >
                    Không thể tải danh sách sản phẩm.
                </p>

                <small
                    style="
                        color:#888;
                    "
                >
                    ${escapeHTML(
                        error.message ||
                        "Lỗi không xác định."
                    )}
                </small>

            </div>

        `;
    }
}


/* =========================================================
   SHOW CHARACTERS
========================================================= */

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


    /* =====================================================
       EMPTY
    ===================================================== */

    if (list.length === 0) {

        characterList.innerHTML = `

            <p
                style="
                    grid-column:1/-1;
                    color:#888;
                    text-align:center;
                    padding:40px 20px;
                "
            >
                Không tìm thấy nhân vật.
            </p>

        `;


        return;
    }


    /* =====================================================
       CREATE CARDS
    ===================================================== */

    list.forEach(
        character => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "character-card";


            const image =
                document.createElement(
                    "img"
                );


            image.className =
                "character-card-image";


            image.src =
                character.image;


            image.alt =
                character.name;


            image.loading =
                "lazy";


            image.onerror =
                () => {

                    image.src =
                        "https://placehold.co/700x900/e8dce5/332b33?text=CHIYOO";
                };


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "character-card-info";


            const category =
                document.createElement(
                    "div"
                );


            category.className =
                "character-card-category";


            category.textContent =
                character.category;


            const name =
                document.createElement(
                    "h3"
                );


            name.className =
                "character-card-name";


            name.textContent =
                character.name;


            const price =
                document.createElement(
                    "div"
                );


            price.className =
                "character-card-price";


            price.textContent =
                character.price;


            info.appendChild(
                category
            );


            info.appendChild(
                name
            );


            info.appendChild(
                price
            );


            card.appendChild(
                image
            );


            card.appendChild(
                info
            );


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


/* =========================================================
   OPEN CHARACTER
========================================================= */

function openCharacter(id) {

    const character =
        characters.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!character) {

        console.warn(
            "Không tìm thấy character:",
            id
        );


        return;
    }


    selectedCharacter =
        character;


    /* =====================================================
       SWITCH PAGE
    ===================================================== */

    homePage?.classList.add(
        "hidden"
    );


    characterPage?.classList.remove(
        "hidden"
    );


    /* =====================================================
       IMAGE
    ===================================================== */

    const detailImage =
        document.getElementById(
            "detail-image"
        );


    if (detailImage) {

        detailImage.src =
            character.image;


        detailImage.alt =
            character.name;


        detailImage.onerror =
            () => {

                detailImage.src =
                    "https://placehold.co/700x900/e8dce5/332b33?text=CHIYOO";
            };
    }


    /* =====================================================
       CATEGORY
    ===================================================== */

    const detailCategory =
        document.getElementById(
            "detail-category"
        );


    if (detailCategory) {

        detailCategory.textContent =
            character.category;
    }


    /* =====================================================
       NAME
    ===================================================== */

    const detailName =
        document.getElementById(
            "detail-name"
        );


    if (detailName) {

        detailName.textContent =
            character.name;
    }


    /* =====================================================
       DESCRIPTION
    ===================================================== */

    const detailDescription =
        document.getElementById(
            "detail-description"
        );


    if (detailDescription) {

        detailDescription.textContent =
            character.description;
    }


    /* =====================================================
       PRICE
    ===================================================== */

    const detailPrice =
        document.getElementById(
            "detail-price"
        );


    if (detailPrice) {

        detailPrice.textContent =
            character.price;
    }


    /* =====================================================
       INCLUDED ITEMS
    ===================================================== */

    const items =
        document.getElementById(
            "detail-items"
        );


    if (items) {

        items.innerHTML =
            "";


        if (
            character.items &&
            character.items.length
        ) {

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

        } else {

            const li =
                document.createElement(
                    "li"
                );


            li.textContent =
                "Thông tin phụ kiện chưa được cập nhật.";


            items.appendChild(
                li
            );
        }
    }


    /* =====================================================
       RESET CALENDAR
    ===================================================== */

    currentMonth =
        8;


    currentYear =
        2026;


    renderCalendar();


    /* =====================================================
       SCROLL TOP
    ===================================================== */

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });
}


/* =========================================================
   HOME
========================================================= */

function goHome() {

    characterPage?.classList.add(
        "hidden"
    );


    homePage?.classList.remove(
        "hidden"
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });
}


/* =========================================================
   SEARCH
========================================================= */

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


    /*
       Nếu không nhập gì:
       hiển thị toàn bộ sản phẩm.
    */

    if (!keyword) {

        showCharacters(
            characters
        );


        return;
    }


    const result =
        characters.filter(
            character => {

                const name =
                    String(
                        character.name || ""
                    ).toLowerCase();


                const category =
                    String(
                        character.category || ""
                    ).toLowerCase();


                const description =
                    String(
                        character.description || ""
                    ).toLowerCase();


                return (
                    name.includes(
                        keyword
                    )

                    ||

                    category.includes(
                        keyword
                    )

                    ||

                    description.includes(
                        keyword
                    )
                );
            }
        );


    showCharacters(
        result
    );
}


/* =========================================================
   CALENDAR
========================================================= */

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


    /* =====================================================
       WEEKDAYS
    ===================================================== */

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


    /* =====================================================
       FIRST DAY
    ===================================================== */

    const firstDay =
        new Date(

            currentYear,

            currentMonth,

            1

        ).getDay();


    /*
       JavaScript:

       Sunday = 0

       Chuyển:

       Monday = 0
    */

    const mondayIndex =
        firstDay === 0
            ? 6
            : firstDay - 1;


    /* =====================================================
       EMPTY DAYS
    ===================================================== */

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


    /* =====================================================
       DAYS IN MONTH
    ===================================================== */

    const daysInMonth =
        new Date(

            currentYear,

            currentMonth + 1,

            0

        ).getDate();


    /* =====================================================
       RENDER DAYS
    ===================================================== */

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const element =
            document.createElement(
                "div"
            );


        const rentedDays =
            Array.isArray(
                selectedCharacter.rentedDays
            )
                ? selectedCharacter.rentedDays
                : [];


        const rented =
            rentedDays.includes(
                day
            );


        element.className =
            `calendar-day ${
                rented
                    ? "rented"
                    : "available"
            }`;


        const number =
            document.createElement(
                "div"
            );


        number.className =
            "calendar-day-number";


        number.textContent =
            day;


        const status =
            document.createElement(
                "span"
            );


        status.className =
            "day-status";


        status.textContent =
            rented
                ? "Đã thuê"
                : "Còn trống";


        element.appendChild(
            number
        );


        element.appendChild(
            status
        );


        /* =================================================
           AVAILABLE
        ================================================= */

        if (!rented) {

            element.addEventListener(
                "click",
                () => {

                    openBooking(
                        day
                    );

                }
            );
        }


        calendar.appendChild(
            element
        );
    }
}


/* =========================================================
   PREVIOUS MONTH
========================================================= */

function previousMonth() {

    currentMonth--;


    if (currentMonth < 0) {

        currentMonth =
            11;


        currentYear--;
    }


    renderCalendar();
}


/* =========================================================
   NEXT MONTH
========================================================= */

function nextMonth() {

    currentMonth++;


    if (currentMonth > 11) {

        currentMonth =
            0;


        currentYear++;
    }


    renderCalendar();
}


/* =========================================================
   OPEN BOOKING
========================================================= */

function openBooking(day) {

    if (!selectedCharacter) {

        showToast(
            "Vui lòng chọn nhân vật."
        );


        return;
    }


    /* =====================================================
       CHECK LOGIN
    ===================================================== */

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


    /* =====================================================
       TITLE
    ===================================================== */

    const title =
        document.getElementById(
            "booking-title"
        );


    if (title) {

        title.textContent =
            `Thuê ${selectedCharacter.name}`;
    }


    /* =====================================================
       DATE
    ===================================================== */

    const date =
        document.getElementById(
            "booking-date"
        );


    if (date) {

        date.textContent =
            `Ngày ${day}/${currentMonth + 1}/${currentYear}`;
    }


    /* =====================================================
       CUSTOMER NAME
    ===================================================== */

    const customerName =
        document.getElementById(
            "customer-name"
        );


    if (customerName) {

        customerName.value =
            currentProfile?.full_name ||
            "";
    }


    /* =====================================================
       PHONE
    ===================================================== */

    const customerPhone =
        document.getElementById(
            "customer-phone"
        );


    if (customerPhone) {

        customerPhone.value =
            currentProfile?.phone ||
            "";
    }


    /* =====================================================
       SHOW MODAL
    ===================================================== */

    modal.classList.remove(
        "hidden"
    );


    setTimeout(() => {

        customerName?.focus();

    }, 50);
}


/* =========================================================
   CLOSE BOOKING
========================================================= */

function closeBooking() {

    document
        .getElementById(
            "booking-modal"
        )
        ?.classList.add(
            "hidden"
        );
}


/* =========================================================
   SUBMIT BOOKING
========================================================= */

function submitBooking(event) {

    event.preventDefault();


    /* =====================================================
       CHECK LOGIN
    ===================================================== */

    if (!currentUser) {

        closeBooking();


        pendingBookingDay =
            null;


        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );


        return;
    }


    /* =====================================================
       FORM DATA
    ===================================================== */

    const name =
        document
            .getElementById(
                "customer-name"
            )
            ?.value
            .trim();


    const phone =
        document
            .getElementById(
                "customer-phone"
            )
            ?.value
            .trim();


    const note =
        document
            .getElementById(
                "customer-note"
            )
            ?.value
            .trim();


    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    if (!name) {

        showToast(
            "Vui lòng nhập họ tên."
        );


        return;
    }


    if (!phone) {

        showToast(
            "Vui lòng nhập số điện thoại."
        );


        return;
    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    console.log(
        "BOOKING PREVIEW:",
        {

            user_id:
                currentUser.id,

            character_id:
                selectedCharacter.id,

            character:
                selectedCharacter.name,

            date:
                `${currentYear}-${String(
                    currentMonth + 1
                ).padStart(2, "0")}-${String(
                    pendingBookingDay || 0
                ).padStart(2, "0")}`,

            name,

            phone,

            note

        }
    );


    /*
       LƯU Ý:

       File cũ chưa có cấu trúc chính xác
       của bảng rentals.

       Vì vậy không tự ý INSERT vào DB
       để tránh làm sai schema Supabase.

       Khi bạn tạo bảng rentals,
       phần này có thể nối trực tiếp.
    */


    closeBooking();


    showToast(
        "Đã nhận thông tin yêu cầu thuê!"
    );


    /*
       Reset form.
    */

    event.target.reset();
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        console.log(
            "TOAST:",
            message
        );


        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    if (toastTimer) {

        clearTimeout(
            toastTimer
        );
    }


    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);
}


/* =========================================================
   FOCUS SEARCH
========================================================= */

function focusSearch() {

    goHome();


    setTimeout(() => {

        const input =
            document.getElementById(
                "search-input"
            );


        if (input) {

            input.focus();

            input.select();
        }

    }, 100);
}


/* =========================================================
   SEARCH ENTER KEY
========================================================= */

function setupSearchEvents() {

    const input =
        document.getElementById(
            "search-input"
        );


    if (!input) {

        return;
    }


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                searchCharacters();
            }

        }
    );


    /*
       Tự động tìm khi người dùng
       gõ vào ô search.
    */

    input.addEventListener(
        "input",
        () => {

            searchCharacters();

        }
    );
}


/* =========================================================
   CLOSE AUTH WHEN CLICK OUTSIDE
========================================================= */

function setupModalEvents() {

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


    const bookingModal =
        document.getElementById(
            "booking-modal"
        );


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
}


/* =========================================================
   ADMIN PAGE
========================================================= */

function openAdminPage() {

    window.location.href =
        "admin.html";
}


/* =========================================================
   IMAGE PRELOAD
========================================================= */

function preloadCharacterImages() {

    characters.forEach(
        character => {

            if (!character.image) {

                return;
            }


            const image =
                new Image();


            image.src =
                character.image;
        }
    );
}


/* =========================================================
   REFRESH SHOP
========================================================= */

async function refreshShop() {

    await loadCharactersFromSupabase();

    preloadCharacterImages();
}


/* =========================================================
   SUPABASE REALTIME
========================================================= */

/*
   Phần này giúp Shop có thể nhận
   thay đổi từ Admin mà không nhất thiết
   phải refresh trang.

   Tuy nhiên Supabase Realtime phải được
   bật cho bảng characters.

   Nếu chưa bật Realtime thì phần này
   không gây lỗi, chỉ đơn giản không
   nhận được event.
*/

function setupCharacterRealtime() {

    try {

        supabaseClient
            .channel(
                "characters-shop"
            )
            .on(

                "postgres_changes",

                {
                    event: "*",

                    schema: "public",

                    table: "characters"

                },

                payload => {

                    console.log(
                        "CHARACTER CHANGE:",
                        payload
                    );


                    refreshShop();

                }

            )
            .subscribe(
                status => {

                    console.log(
                        "CHARACTER REALTIME:",
                        status
                    );

                }
            );

    } catch (error) {

        console.warn(
            "Realtime chưa được thiết lập:",
            error
        );
    }
}


/* =========================================================
   HANDLE PAGE VISIBILITY
========================================================= */

/*
   Khi người dùng quay lại tab Shop,
   kiểm tra lại sản phẩm.

   Ví dụ:

   Tab 1 = Shop
   Tab 2 = Admin

   Admin xóa sản phẩm.

   Quay lại Tab 1.

   Shop sẽ reload dữ liệu.
*/

function setupVisibilityRefresh() {

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                refreshShop();

            }

        }
    );
}


/* =========================================================
   HANDLE ESC KEY
========================================================= */

function setupEscapeKey() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            closeAuthModal();

            closeBooking();

        }
    );
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "CHIYOO SHOP INITIALIZING..."
        );


        /*
           Setup UI events trước.
        */

        setupSearchEvents();

        setupModalEvents();

        setupEscapeKey();


        /*
           Load Auth.
        */

        await initAuth();


        /*
           Load sản phẩm từ Supabase.
        */

        await loadCharactersFromSupabase();


        /*
           Preload ảnh.
        */

        preloadCharacterImages();


        /*
           Supabase realtime.
        */

        setupCharacterRealtime();


        /*
           Khi quay lại tab Shop,
           kiểm tra sản phẩm.
        */

        setupVisibilityRefresh();


        console.log(
            "CHIYOO SHOP READY."
        );

    }
);


/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================

   Các hàm dưới đây được đưa lên window
   để onclick="" trong index.html
   vẫn hoạt động bình thường.

   Ví dụ:

       onclick="openAuthModal()"

       onclick="toggleAuthMode()"

       onclick="searchCharacters()"

       onclick="goHome()"

       onclick="previousMonth()"

       onclick="nextMonth()"

       onclick="closeBooking()"

       onclick="submitBooking(event)"

       onclick="openAdminPage()"
========================================================= */

window.openAuthModal =
    openAuthModal;


window.closeAuthModal =
    closeAuthModal;


window.toggleAuthMode =
    toggleAuthMode;


window.setAuthMode =
    setAuthMode;


window.handleAuthSubmit =
    handleAuthSubmit;


window.signOutUser =
    signOutUser;


window.searchCharacters =
    searchCharacters;


window.focusSearch =
    focusSearch;


window.showCharacters =
    showCharacters;


window.openCharacter =
    openCharacter;


window.goHome =
    goHome;


window.renderCalendar =
    renderCalendar;


window.previousMonth =
    previousMonth;


window.nextMonth =
    nextMonth;


window.openBooking =
    openBooking;


window.closeBooking =
    closeBooking;


window.submitBooking =
    submitBooking;


window.showToast =
    showToast;


window.openAdminPage =
    openAdminPage;


window.loadCharactersFromSupabase =
    loadCharactersFromSupabase;


window.refreshShop =
    refreshShop;


/* =========================================
   IMAGE LIGHTBOX
========================================= */

function openImageLightbox() {

    const detailImage =
        document.getElementById("detail-image");

    const lightbox =
        document.getElementById("image-lightbox");

    const lightboxImage =
        document.getElementById("lightbox-image");

    if (!detailImage || !lightbox || !lightboxImage) {
        return;
    }

    if (!detailImage.src) {
        return;
    }

    lightboxImage.src = detailImage.src;
    lightboxImage.alt = detailImage.alt || "";

    lightbox.classList.remove("hidden");

    document.body.style.overflow = "hidden";
}


function closeImageLightbox() {

    const lightbox =
        document.getElementById("image-lightbox");

    if (!lightbox) {
        return;
    }

    lightbox.classList.add("hidden");

    document.body.style.overflow = "";

}


/* Bấm vào ảnh chi tiết */

document.addEventListener("click", function(event) {

    if (
        event.target &&
        event.target.id === "detail-image"
    ) {
        openImageLightbox();
    }

});


/* Nhấn ESC để đóng */

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {
        closeImageLightbox();
    }

});

/* =========================================================
   END
========================================================= */
