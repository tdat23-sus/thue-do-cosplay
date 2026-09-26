```javascript
/* =========================================================
   CHIYOO SHOP
   SCRIPT.JS - CLEAN VERSION
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
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let authMode = "login";

let pendingBookingDay = null;

let characters = [];

let selectedCharacter = null;
let selectedBookingDay = null;

let currentMonth =
    new Date().getMonth();

let currentYear =
    new Date().getFullYear();


/* =========================================================
   DOM
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
   HELPERS
   ========================================================= */

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


function parseDate(value) {

    if (!value) {
        return null;
    }

    const parts =
        String(value)
            .slice(0, 10)
            .split("-")
            .map(Number);

    if (
        parts.length !== 3 ||
        parts.some(
            number =>
                Number.isNaN(number)
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


function normalizeDate(value) {

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


function dateRange(
    startDate,
    endDate
) {

    const result = [];

    const start =
        parseDate(startDate);

    const end =
        parseDate(endDate);

    if (!start || !end) {
        return result;
    }

    const cursor =
        new Date(start);

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


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        window.__toastTimer
    );

    window.__toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);
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

    setAuthMode(
        authMode
    );

    setTimeout(() => {

        document
            .getElementById(
                "auth-email"
            )
            ?.focus();

    }, 50);
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

    const message =
        document.getElementById(
            "auth-message"
        );

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

    authMode =
        mode === "register"
            ? "register"
            : "login";

    const isRegister =
        authMode === "register";


    const title =
        document.getElementById(
            "auth-title"
        );

    if (title) {

        title.textContent =
            isRegister
                ? "Tạo tài khoản"
                : "Đăng nhập";

    }


    const submit =
        document.getElementById(
            "auth-submit"
        );

    if (submit) {

        submit.textContent =
            isRegister
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
            !isRegister
        );

    }


    const nameInput =
        document.getElementById(
            "auth-name"
        );

    if (nameInput) {

        nameInput.required =
            isRegister;

    }


    const switchText =
        document.getElementById(
            "auth-switch-text"
        );

    if (switchText) {

        switchText.textContent =
            isRegister
                ? "Đã có tài khoản?"
                : "Chưa có tài khoản?";

    }


    const switchButton =
        document.getElementById(
            "auth-switch"
        );

    if (switchButton) {

        switchButton.textContent =
            isRegister
                ? "Đăng nhập"
                : "Đăng ký";

    }
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function translateAuthError(
    message
) {

    if (!message) {

        return "Có lỗi xảy ra.";

    }


    const text =
        String(message);


    if (
        text.includes(
            "Invalid login credentials"
        )
    ) {

        return (
            "Email hoặc mật khẩu không đúng."
        );

    }


    if (
        text.includes(
            "Email not confirmed"
        )
    ) {

        return (
            "Email chưa được xác nhận. Hãy kiểm tra hộp thư."
        );

    }


    if (
        text.includes(
            "User already registered"
        )
    ) {

        return (
            "Email này đã được đăng ký."
        );

    }


    if (
        text.includes(
            "Password should be at least"
        )
    ) {

        return (
            "Mật khẩu phải có ít nhất 6 ký tự."
        );

    }


    if (
        text.includes(
            "Unable to validate email"
        )
    ) {

        return (
            "Email không hợp lệ."
        );

    }


    if (
        text.includes(
            "Email rate limit exceeded"
        )
    ) {

        return (
            "Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại."
        );

    }


    return text;
}


/* =========================================================
   AUTH SUBMIT
   ========================================================= */

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

    const messageElement =
        document.getElementById(
            "auth-message"
        );


    const email =
        emailInput?.value
            ?.trim() ||
        "";

    const password =
        passwordInput?.value ||
        "";

    const name =
        nameInput?.value
            ?.trim() ||
        "";


    if (!email) {

        if (messageElement) {

            messageElement.textContent =
                "Vui lòng nhập email.";

        }

        return;
    }


    if (!password) {

        if (messageElement) {

            messageElement.textContent =
                "Vui lòng nhập mật khẩu.";

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

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Đang xử lý...";

    }


    if (messageElement) {

        messageElement.textContent =
            "";

    }


    try {

        /* =================================================
           REGISTER
           ================================================= */

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

                        email:
                            email,

                        password:
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


            /*
               Không dùng emailRedirectTo localhost nữa.
               Supabase sẽ dùng cấu hình redirect của project.
            */

            if (
                data?.session
            ) {

                currentUser =
                    data.user ||
                    null;

                await loadCurrentProfile(
                    currentUser
                );

                updateAuthUI();

                closeAuthModal();

                showToast(
                    "Tạo tài khoản thành công!"
                );

            } else {

                if (messageElement) {

                    messageElement.textContent =
                        "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản nếu Supabase yêu cầu.";

                }

            }

            return;
        }


        /* =================================================
           LOGIN
           ================================================= */

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signInWithPassword({

                    email:
                        email,

                    password:
                        password

                });


        if (error) {
            throw error;
        }


        currentUser =
            data?.user ||
            null;


        await loadCurrentProfile(
            currentUser
        );


        updateAuthUI();


        closeAuthModal();


        showToast(
            "Đăng nhập thành công!"
        );


        /*
           Nếu khách đang chọn ngày trước
           khi đăng nhập thì mở lại form.
        */

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


        const translated =
            translateAuthError(
                error?.message
            );


        if (messageElement) {

            messageElement.textContent =
                translated;

        } else {

            alert(
                translated
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
   LOAD CURRENT PROFILE
   ========================================================= */

async function loadCurrentProfile(
    user
) {

    currentUser =
        user || null;

    currentProfile =
        null;


    if (!currentUser) {

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
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        /*
           Không làm đăng nhập thất bại
           chỉ vì profiles có lỗi RLS.
        */

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

    const adminButton =
        document.getElementById(
            "admin-button"
        );


    if (!currentUser) {

        if (button) {

            button.style.display =
                "inline-block";

        }

        if (userBox) {

            userBox.style.display =
                "none";

        }

        if (adminButton) {

            adminButton.style.display =
                "none";

        }

        return;
    }


    if (button) {

        button.style.display =
            "none";

    }


    if (userBox) {

        userBox.style.display =
            "flex";

    }


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


    if (adminButton) {

        adminButton.style.display =
            isAdmin
                ? "inline-block"
                : "none";

    }
}


/* =========================================================
   SIGN OUT
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
            "SIGN OUT ERROR:",
            error
        );

        showToast(
            "Không thể đăng xuất."
        );

        return;
    }


    currentUser =
        null;

    currentProfile =
        null;

    updateAuthUI();

    showToast(
        "Đã đăng xuất."
    );
}


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient
    .auth
    .onAuthStateChange(
        (
            event,
            session
        ) => {

            /*
               Không gọi quá nhiều truy vấn Supabase
               trực tiếp trong callback auth.
            */

            setTimeout(
                async () => {

                    await loadCurrentProfile(
                        session?.user ||
                        null
                    );

                },
                0
            );

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

        currentUser =
            null;

        updateAuthUI();

        return;

    }


    await loadCurrentProfile(
        data?.session?.user ||
        null
    );
}


/* =========================================================
   LOAD CHARACTERS
   ========================================================= */

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
        (data || [])
            .map(
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


    if (
        list.length ===
        0
    ) {

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
                    src="${escapeHtml(character.image)}"
                    alt="${escapeHtml(character.name)}"
                >

                <div
                    class="character-card-info"
                >

                    <div
                        class="character-card-category"
                    >
                        ${escapeHtml(character.category)}
                    </div>

                    <h3
                        class="character-card-name"
                    >
                        ${escapeHtml(character.name)}
                    </h3>

                    <div
                        class="character-card-address"
                    >
                        ${escapeHtml(character.address)}
                    </div>

                </div>
            `;


            card.onclick =
                () => {

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


/* =========================================================
   OPEN CHARACTER
   ========================================================= */

async function openCharacter(
    id
) {

    const character =
        characters.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!character) {
        return;
    }


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


    const detailAddress =
        document.getElementById(
            "detail-address"
        );


    if (detailAddress) {

        detailAddress.textContent =
            character.address ||
            "Chưa cập nhật địa chỉ";

    }


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


    currentMonth =
        new Date().getMonth();

    currentYear =
        new Date().getFullYear();


    character.rentedDays =
        [];


    await loadRentedDays();


    renderCalendar();


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


    const result =
        characters.filter(
            character => {

                const name =
                    String(
                        character.name
                    )
                        .toLowerCase();

                const category =
                    String(
                        character.category
                    )
                        .toLowerCase();

                const address =
                    String(
                        character.address
                    )
                        .toLowerCase();


                return (
                    name.includes(
                        keyword
                    ) ||
                    category.includes(
                        keyword
                    ) ||
                    address.includes(
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
   LOAD REAL RENTAL DAYS
   ========================================================= */

async function loadRentedDays() {

    if (
        !selectedCharacter
    ) {
        return;
    }


    /*
       Không dùng character.rentedDays cũ.
       Mỗi lần mở/chuyển tháng đều lấy
       dữ liệu thật từ Supabase.
    */

    selectedCharacter.rentedDays =
        [];


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


    /*
       Ưu tiên RPC get_rented_dates
       mà bạn đã tạo.
    */

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


    if (!error) {

        (
            data || []
        ).forEach(
            row => {

                const date =
                    normalizeDate(
                        row.rental_date
                    );


                if (!date) {
                    return;
                }


                const parsed =
                    parseDate(date);


                if (!parsed) {
                    return;
                }


                /*
                   RPC có thể trả ngày nằm
                   trong khoảng start/end.
                */

                const day =
                    parsed.getDate();


                if (
                    !selectedCharacter
                        .rentedDays
                        .includes(day)
                ) {

                    selectedCharacter
                        .rentedDays
                        .push(day);

                }

            }
        );


        return;
    }


    /*
       Nếu RPC lỗi, fallback trực tiếp
       vào bảng rentals.
    */

    console.error(
        "get_rented_dates error:",
        error
    );


    const fallback =
        await supabaseClient
            .from("rentals")
            .select(
                "id,start_date,end_date,status"
            )
            .eq(
                "character_id",
                Number(
                    selectedCharacter.id
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
            );


    if (fallback.error) {

        console.error(
            "Rental fallback error:",
            fallback.error
        );

        return;
    }


    (
        fallback.data || []
    ).forEach(
        rental => {

            const dates =
                dateRange(
                    rental.start_date,
                    rental.end_date
                );


            dates.forEach(
                date => {

                    const parsed =
                        parseDate(date);


                    if (!parsed) {
                        return;
                    }


                    if (
                        parsed.getMonth() !==
                        currentMonth
                    ) {
                        return;
                    }


                    if (
                        parsed.getFullYear() !==
                        currentYear
                    ) {
                        return;
                    }


                    const day =
                        parsed.getDate();


                    if (
                        !selectedCharacter
                            .rentedDays
                            .includes(day)
                    ) {

                        selectedCharacter
                            .rentedDays
                            .push(day);

                    }

                }
            );

        }
    );
}


/* =========================================================
   CHECK AVAILABILITY
   ========================================================= */

async function checkRentalAvailability(
    characterId,
    startDate,
    endDate
) {

    /*
       Lớp kiểm tra 1:
       RPC database.
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
                        Number(
                            characterId
                        ),

                    p_start_date:
                        startDate,

                    p_end_date:
                        endDate

                }
            );


    if (!error) {

        return {

            available:
                data === true ||
                data?.available === true,

            error:
                null

        };

    }


    console.error(
        "Availability RPC error:",
        error
    );


    /*
       Lớp kiểm tra 2:
       truy vấn trực tiếp rentals.
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


    if (fallback.error) {

        console.error(
            "Availability fallback error:",
            fallback.error
        );

        return {

            available:
                false,

            error:
                fallback.error

        };

    }


    return {

        available:
            !(
                fallback.data &&
                fallback.data.length > 0
            ),

        error:
            null

    };
}


/* =========================================================
   CALENDAR
   ========================================================= */

function renderCalendar() {

    if (
        !selectedCharacter
    ) {
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


    if (
        !calendar ||
        !monthTitle
    ) {
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

        const element =
            document.createElement(
                "div"
            );


        const rented =
            selectedCharacter
                .rentedDays
                .includes(
                    day
                );


        const date =
            new Date(
                currentYear,
                currentMonth,
                day
            );


        const isPast =
            date < today;


        element.className =
            "calendar-day";


        if (rented) {

            element.classList.add(
                "rented"
            );

        } else if (isPast) {

            element.classList.add(
                "past"
            );

        } else {

            element.classList.add(
                "available"
            );

        }


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
                        : isPast
                            ? "Đã qua"
                            : "Còn trống"
                }
            </span>

        `;


        if (
            !rented &&
            !isPast
        ) {

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


/* =========================================================
   MONTH NAVIGATION
   ========================================================= */

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


/* =========================================================
   BOOKING MODAL
   ========================================================= */

function openBooking(
    day
) {

    if (
        !selectedCharacter
    ) {

        showToast(
            "Vui lòng chọn nhân vật."
        );

        return;

    }


    /*
       Kiểm tra client trước.
    */

    if (
        selectedCharacter
            .rentedDays
            .includes(
                Number(day)
            )
    ) {

        showToast(
            "Ngày này đã có người thuê."
        );

        return;

    }


    /*
       Nếu chưa đăng nhập,
       lưu lại ngày và mở login.
    */

    if (!currentUser) {

        pendingBookingDay =
            Number(day);

        openAuthModal(
            "Bạn cần đăng nhập để gửi yêu cầu thuê."
        );

        return;

    }


    selectedBookingDay =
        Number(day);


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
            `Ngày ${
                selectedBookingDay
            }/${
                currentMonth + 1
            }/${
                currentYear
            }`;

    }


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
            currentProfile?.full_name ||
            "";

    }


    if (customerPhone) {

        customerPhone.value =
            currentProfile?.phone ||
            "";

    }


    modal.classList.remove(
        "hidden"
    );


    customerName?.focus();
}


/* =========================================================
   CLOSE BOOKING
   ========================================================= */

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


    selectedBookingDay =
        null;
}


/* =========================================================
   SUBMIT BOOKING
   ========================================================= */

async function submitBooking(
    event
) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    if (!currentUser) {

        closeBooking();

        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );

        return;

    }


    if (
        !selectedCharacter
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


    const nameInput =
        document.getElementById(
            "customer-name"
        );


    const phoneInput =
        document.getElementById(
            "customer-phone"
        );


    const noteInput =
        document.getElementById(
            "customer-note"
        );


    const name =
        nameInput?.value
            ?.trim() ||
        "";


    const phone =
        phoneInput?.value
            ?.trim() ||
        "";


    const note =
        noteInput?.value
            ?.trim() ||
        "";


    if (!name) {

        showToast(
            "Vui lòng nhập họ tên."
        );

        nameInput?.focus();

        return;

    }


    if (!phone) {

        showToast(
            "Vui lòng nhập số điện thoại."
        );

        phoneInput?.focus();

        return;

    }


    const month =
        String(
            currentMonth + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            selectedBookingDay
        ).padStart(
            2,
            "0"
        );


    const startDate =
        `${currentYear}-${month}-${day}`;


    const endDate =
        startDate;


    /*
       Kiểm tra client lần nữa.
    */

    if (
        selectedCharacter
            .rentedDays
            .includes(
                Number(
                    selectedBookingDay
                )
            )
    ) {

        closeBooking();

        showToast(
            "Ngày này vừa có người đặt."
        );

        return;

    }


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Đang gửi...";

    }


    try {

        /*
           Kiểm tra trực tiếp database
           ngay trước khi INSERT.
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

            throw new Error(
                "Không thể kiểm tra tình trạng ngày thuê."
            );

        }


        if (
            !availability.available
        ) {

            selectedCharacter
                .rentedDays
                .push(
                    Number(
                        selectedBookingDay
                    )
                );


            renderCalendar();

            closeBooking();

            showToast(
                "Ngày này vừa có người đặt. Vui lòng chọn ngày khác."
            );

            return;

        }


        /*
           Cập nhật profile.
           Nếu update profile lỗi,
           vẫn tiếp tục tạo đơn.
        */

        const {
            error:
                profileError
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

            console.warn(
                "PROFILE UPDATE ERROR:",
                profileError
            );

        }


        /*
           Nội dung ghi chú.
        */

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


        /*
           Tạo rental.
        */

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
                        Number(
                            selectedCharacter.id
                        ),

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


        if (error) {

            /*
               PostgreSQL exclusion/
               unique constraint.
            */

            if (
                error.code ===
                    "23P01" ||
                error.code ===
                    "23505"
            ) {

                if (
                    !selectedCharacter
                        .rentedDays
                        .includes(
                            Number(
                                selectedBookingDay
                            )
                        )
                ) {

                    selectedCharacter
                        .rentedDays
                        .push(
                            Number(
                                selectedBookingDay
                            )
                        );

                }


                renderCalendar();

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


        /*
           Cập nhật profile trong bộ nhớ.
        */

        if (currentProfile) {

            currentProfile.full_name =
                name;

            currentProfile.phone =
                phone;

        }


        /*
           Khóa ngày ngay lập tức
           trên giao diện.
        */

        if (
            !selectedCharacter
                .rentedDays
                .includes(
                    Number(
                        selectedBookingDay
                    )
                )
        ) {

            selectedCharacter
                .rentedDays
                .push(
                    Number(
                        selectedBookingDay
                    )
                );

        }


        renderCalendar();


        form.reset();


        closeBooking();


        showToast(
            "Đặt thuê thành công! Shop sẽ liên hệ với bạn."
        );


        /*
           Tải lại dữ liệu thật.
        */

        await loadRentedDays();

        renderCalendar();


    } catch (error) {

        console.error(
            "BOOKING ERROR:",
            error
        );


        showToast(
            error?.message ||
            "Không thể tạo đơn. Vui lòng thử lại."
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Gửi yêu cầu thuê";

        }

    }
}


/* =========================================================
   SEARCH FOCUS
   ========================================================= */

function focusSearch() {

    goHome();


    setTimeout(
        () => {

            document
                .getElementById(
                    "search-input"
                )
                ?.focus();

        },
        100
    );
}


/* =========================================================
   IMAGE LIGHTBOX
   ========================================================= */

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


    if (!detailImage.src) {
        return;
    }


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


    if (!lightbox) {
        return;
    }


    lightbox.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";
}


/* =========================================================
   IMAGE CLICK
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            event.target?.id ===
            "detail-image"
        ) {

            openImageLightbox();

        }

    }
);


/* =========================================================
   ESC
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeImageLightbox();

            closeAuthModal();

        }

    }
);


/* =========================================================
   CLOSE AUTH OUTSIDE
   ========================================================= */

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


/* =========================================================
   ADMIN
   ========================================================= */

function openAdminPage() {

    window.location.href =
        "admin.html";
}


/* =========================================================
   MAKE INLINE HTML FUNCTIONS GLOBAL
   ========================================================= */

window.openAuthModal =
    openAuthModal;

window.closeAuthModal =
    closeAuthModal;

window.toggleAuthMode =
    toggleAuthMode;

window.handleAuthSubmit =
    handleAuthSubmit;

window.signOutUser =
    signOutUser;

window.goHome =
    goHome;

window.focusSearch =
    focusSearch;

window.searchCharacters =
    searchCharacters;

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

window.openImageLightbox =
    openImageLightbox;

window.closeImageLightbox =
    closeImageLightbox;

window.openAdminPage =
    openAdminPage;


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initApp() {

    try {

        /*
           Auth trước.
        */

        await initAuth();


        /*
           Sau đó tải characters.
        */

        await loadCharactersFromSupabase();


    } catch (error) {

        console.error(
            "INIT ERROR:",
            error
        );

    }

}


initApp();
```
