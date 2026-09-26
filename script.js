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
   AUTH MODAL
========================================= */

function openAuthModal(message = "") {

    const modal =
        document.getElementById(
            "auth-modal"
        );

    if (!modal) return;

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


function closeAuthModal() {

    document
        .getElementById(
            "auth-modal"
        )
        ?.classList.add(
            "hidden"
        );
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
        document.getElementById(
            "auth-title"
        );

    if (title) {
        title.textContent =
            register
                ? "Tạo tài khoản"
                : "Đăng nhập";
    }


    const submit =
        document.getElementById(
            "auth-submit"
        );

    if (submit) {
        submit.textContent =
            register
                ? "Đăng ký"
                : "Đăng nhập";
    }


    const nameLabel =
        document.getElementById(
            "auth-name-label"
        );

    if (nameLabel) {
        nameLabel.classList.toggle(
            "hidden",
            !register
        );
    }


    const switchText =
        document.getElementById(
            "auth-switch-text"
        );

    if (switchText) {
        switchText.textContent =
            register
                ? "Đã có tài khoản?"
                : "Chưa có tài khoản?";
    }


    const switchButton =
        document.getElementById(
            "auth-switch"
        );

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


    const email =
        document
            .getElementById(
                "auth-email"
            )
            .value
            .trim();


    const password =
        document
            .getElementById(
                "auth-password"
            )
            .value;


    const name =
        document
            .getElementById(
                "auth-name"
            )
            .value
            .trim();


    const submitButton =
        document.getElementById(
            "auth-submit"
        );


    submitButton.disabled = true;

    submitButton.textContent =
        "Đang xử lý...";


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
    },

    emailRedirectTo:
        "http://localhost:3000/"

}

                    });


            if (error)
                throw error;


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


        /* =========================
           LOGIN
        ========================= */

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


            if (error)
                throw error;


            closeAuthModal();


            showToast(
                "Đăng nhập thành công!"
            );


            if (
                pendingBookingDay !==
                null
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


        const message =
            document.getElementById(
                "auth-message"
            );

        if (message) {

            message.textContent =
                translateAuthError(
                    error.message
                );

        }

    } finally {

        submitButton.disabled =
            false;


        submitButton.textContent =
            authMode === "register"
                ? "Đăng ký"
                : "Đăng nhập";

    }

}


/* =========================================
   AUTH ERROR
========================================= */

function translateAuthError(message) {

    if (!message)
        return "Có lỗi xảy ra.";


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


/* =========================================
   LOGOUT
========================================= */

async function signOutUser() {

    const {
        error
    } =
        await supabaseClient
            .auth
            .signOut();


    if (error) {

        console.error(error);

        showToast(
            "Không thể đăng xuất."
        );

        return;
    }


    showToast(
        "Đã đăng xuất."
    );
}


/* =========================================
   LOAD PROFILE
========================================= */

async function loadCurrentProfile(user) {

    currentUser = user;

    currentProfile = null;


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

        currentProfile = data;

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

    const name =
        document.getElementById(
            "auth-user-name"
        );

    const role =
        document.getElementById(
            "auth-user-role"
        );

    if (!button || !userBox)
        return;


    /* =========================
       NOT LOGGED IN
    ========================= */

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


    /* =========================
       LOGGED IN
    ========================= */

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
        currentProfile?.role ===
        "admin";


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


/* =========================================
   AUTH STATE LISTENER
========================================= */

supabaseClient
    .auth
    .onAuthStateChange(
        (_event, session) => {

            setTimeout(() => {

                loadCurrentProfile(
                    session?.user ||
                    null
                );

            }, 0);

        }
    );


/* =========================================
   INIT AUTH
========================================= */

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
        data.session?.user ||
        null
    );
}


/* =========================================
   LOAD CHARACTERS FROM SUPABASE
========================================= */

async function loadCharactersFromSupabase() {

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
                address,
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

        console.error(
            "CHARACTERS ERROR:",
            error
        );

        showToast(
            "Không thể tải danh sách nhân vật."
        );

        return;

    }


    characters =
        (data || []).map(
            character => ({

                id:
                    character.id,

                name:
                    character.name ||
                    "Chưa có tên",

                category:
                    character.category ||
                    "Khác",

                description:
                    character.description ||
                    "Chưa có mô tả.",

                address:
                    character.address ||
                    "Chưa cập nhật địa chỉ",

                image:
                    character.image_url ||
                    "https://placehold.co/700x900?text=No+Image",

                items:
                    Array.isArray(
                        character.included_items
                    )
                        ? character.included_items
                        : [],

                rentedDays:
                    []

            })
        );


    showCharacters();
}


/* =========================================
   SHOW CHARACTERS
========================================= */

function showCharacters(
    list = characters
) {

    if (!characterList)
        return;


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
                        class="character-card-address"
                    >
                        ${character.address}
                    </div>

                </div>

            `;


            card.onclick = () => {

                openCharacter(
                    character.id
                );

            };


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
            item =>
                item.id === id
        );


    if (!character)
        return;


    selectedCharacter =
        character;


    homePage?.classList.add(
        "hidden"
    );


    characterPage?.classList.remove(
        "hidden"
    );


    const detailImage =
        document.getElementById(
            "detail-image"
        );

    if (detailImage) {

        detailImage.src =
            character.image;

        detailImage.alt =
            character.name;

    }


    const detailCategory =
        document.getElementById(
            "detail-category"
        );

    if (detailCategory) {

        detailCategory.textContent =
            character.category;

    }


    const detailName =
        document.getElementById(
            "detail-name"
        );

    if (detailName) {

        detailName.textContent =
            character.name;

    }


    const detailDescription =
        document.getElementById(
            "detail-description"
        );

    if (detailDescription) {

        detailDescription.textContent =
            character.description;

    }


    /* =========================
       ĐỊA CHỈ
    ========================= */

    const detailAddress = document.getElementById("detail-address");

if (detailAddress) {
    detailAddress.textContent =
        character.address || "Chưa cập nhật địa chỉ";
}


    /* =========================
       ITEMS
    ========================= */

    const items =
        document.getElementById(
            "detail-items"
        );


    if (items) {

        items.innerHTML =
            "";


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


    currentMonth = 8;
    currentYear = 2026;


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


/* =========================================
   SEARCH
========================================= */

function searchCharacters() {

    const input =
        document.getElementById(
            "search-input"
        );

    if (!input)
        return;


    const keyword =
        input.value
            .toLowerCase()
            .trim();


    const result =
        characters.filter(
            character =>

                character.name
                    .toLowerCase()
                    .includes(
                        keyword
                    )

                ||

                character.category
                    .toLowerCase()
                    .includes(
                        keyword
                    )

                ||

                character.address
                    .toLowerCase()
                    .includes(
                        keyword
                    )
        );


    showCharacters(result);
}


/* =========================================
   CALENDAR
========================================= */

function renderCalendar() {

    if (!selectedCharacter)
        return;


    const calendar =
        document.getElementById(
            "calendar"
        );


    const monthTitle =
        document.getElementById(
            "month-title"
        );


    if (!calendar ||
        !monthTitle)
        return;


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
            selectedCharacter
                .rentedDays
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


        if (!rented) {

            element.onclick =
                () => {

                    openBooking(
                        day
                    );

                };

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


    if (!modal)
        return;


    document
        .getElementById(
            "booking-title"
        )
        .textContent =
        `Thuê ${selectedCharacter.name}`;


    document
        .getElementById(
            "booking-date"
        )
        .textContent =
        `Ngày ${day}/${currentMonth + 1}/${currentYear}`;


    modal.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "customer-name"
        )
        .value =
        currentProfile?.full_name ||
        "";


    document
        .getElementById(
            "customer-phone"
        )
        .value =
        currentProfile?.phone ||
        "";


    document
        .getElementById(
            "customer-name"
        )
        ?.focus();

}

/* =========================================
   CLOSE BOOKING
========================================= */

function closeBooking() {

    document
        .getElementById(
            "booking-modal"
        )
        ?.classList.add(
            "hidden"
        );

}


/* =========================================
   SUBMIT BOOKING
========================================= */

const month =
    String(currentMonth + 1)
        .padStart(2, "0");

const day =
    String(selectedBookingDay)
        .padStart(2, "0");

const startDate =
    `${currentYear}-${month}-${day}`;

const endDate =
    startDate;


    /* =========================
       CHECK LOGIN
    ========================= */

    if (!currentUser) {

        closeBooking();

        pendingBookingDay = null;

        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );

        return;
    }


    /* =========================
       CHECK CHARACTER
    ========================= */

    if (!selectedCharacter) {

        showToast(
            "Không xác định được nhân vật."
        );

        return;
    }


    /* =========================
       GET FORM DATA
    ========================= */

    const name =
        document
            .getElementById("customer-name")
            .value
            .trim();


    const phone =
        document
            .getElementById("customer-phone")
            .value
            .trim();


    const note =
        document
            .getElementById("customer-note")
            .value
            .trim();


    /* =========================
       CHECK REQUIRED
    ========================= */

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


    /* =========================
       CREATE DATE
       YYYY-MM-DD
    ========================= */

    const month =
        String(currentMonth + 1)
            .padStart(2, "0");


    const day =
        String(
            pendingBookingDay ||
            Number(
                document
                    .getElementById("booking-date")
                    ?.textContent
                    ?.match(/\d+/)?.[0]
            )
        ).padStart(2, "0");


    const startDate =
        `${currentYear}-${month}-${day}`;


    /*
       Hiện tại hệ thống cho thuê theo ngày.
       Vì vậy start_date và end_date
       sẽ cùng là ngày khách chọn.
    */

    const endDate =
        startDate;


    /* =========================
       DISABLE BUTTON
    ========================= */

    const submitButton =
        event.target.querySelector(
            'button[type="submit"]'
        );


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Đang gửi...";
    }


    try {

        /* =========================
           UPDATE PROFILE
        ========================= */

        const {
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .update({

                    full_name:
                        name,

                    phone:
                        phone

                })
                .eq(
                    "id",
                    currentUser.id
                );


        if (profileError) {

            console.error(
                "PROFILE UPDATE ERROR:",
                profileError
            );

            /*
               Không dừng đơn ở đây.
               Nếu profile update lỗi,
               vẫn thử tạo rental.
            */
        }


        /* =========================
           CUSTOMER NOTE
        ========================= */

        const customerNote =
            [
                `Họ tên: ${name}`,
                `SĐT: ${phone}`,
                note
                    ? `Ghi chú: ${note}`
                    : ""
            ]
                .filter(Boolean)
                .join("\n");


        /* =========================
           INSERT RENTAL
        ========================= */

        const {
            data,
            error
        } =
            await supabaseClient
                .from("rentals")
                .insert({

                    user_id:
                        currentUser.id,

                    character_id:
                        selectedCharacter.id,

                    start_date:
                        startDate,

                    end_date:
                        endDate,

                    customer_note:
                        customerNote,

                    status:
                        "pending"

                })
                .select()
                .single();


        if (error)
            throw error;


        console.log(
            "BOOKING CREATED:",
            data
        );


        /* =========================
           CLOSE MODAL
        ========================= */

        closeBooking();


        /* =========================
           SUCCESS
        ========================= */

        showToast(
            "Đặt thuê thành công! Shop sẽ liên hệ với bạn."
        );


        /* =========================
           RESET FORM
        ========================= */

        event.target.reset();


        /*
           Cập nhật thông tin profile
           trong bộ nhớ hiện tại.
        */

        if (currentProfile) {

            currentProfile.full_name =
                name;

            currentProfile.phone =
                phone;

        }


        /*
           Tạm thời đánh dấu ngày này đã có đơn
           để giao diện lịch cập nhật ngay.
        */

        if (
            !selectedCharacter.rentedDays
                .includes(
                    Number(day)
                )
        ) {

            selectedCharacter.rentedDays
                .push(
                    Number(day)
                );

        }


        renderCalendar();


    } catch (error) {

        console.error(
            "BOOKING ERROR:",
            error
        );


        showToast(
            "Không thể tạo đơn. Vui lòng thử lại."
        );


    } finally {

        /* =========================
           ENABLE BUTTON
        ========================= */

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Gửi yêu cầu";

        }

    }

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast)
        return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


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

        document
            .getElementById(
                "search-input"
            )
            ?.focus();

    }, 100);

}


/* =========================================
   IMAGE LIGHTBOX
========================================= */

function openImageLightbox() {

    const detailImage =
        document.getElementById(
            "detail-image"
        );

    const lightbox =
        document.getElementById(
            "image-lightbox"
        );

    const lightboxImage =
        document.getElementById(
            "lightbox-image"
        );


    if (
        !detailImage ||
        !lightbox ||
        !lightboxImage
    ) {

        return;

    }


    if (!detailImage.src)
        return;


    lightboxImage.src =
        detailImage.src;


    lightboxImage.alt =
        detailImage.alt ||
        "";


    lightbox.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";
}


function closeImageLightbox() {

    const lightbox =
        document.getElementById(
            "image-lightbox"
        );


    if (!lightbox)
        return;


    lightbox.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";
}


/* =========================================
   CLICK IMAGE
========================================= */

document.addEventListener(
    "click",
    function(event) {

        if (
            event.target &&
            event.target.id ===
                "detail-image"
        ) {

            openImageLightbox();

        }

    }
);


/* =========================================
   ESC CLOSE LIGHTBOX
========================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Escape"
        ) {

            closeImageLightbox();

        }

    }
);


/* =========================================
   CLOSE AUTH WHEN CLICK OUTSIDE
========================================= */

document
    .getElementById(
        "auth-modal"
    )
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "auth-modal"
            ) {

                closeAuthModal();

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

    await loadCharactersFromSupabase();

    await initAuth();

}


initApp();
