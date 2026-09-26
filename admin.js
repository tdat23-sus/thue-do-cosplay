const SUPABASE_URL =
    "https://rydkgmtlmhjftbwukzdn.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_wIOEpyFJLjH_aWSwnUIF-g_WCvEUOot";

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const BUCKET = "character-images";

let selectedFile = null;
let editingCharacterId = null;
let editingCharacterImageUrl = null;

let charactersCache = [];

// =========================
// DOM
// =========================

const accessNotice =
    document.getElementById("access-notice");

const adminContent =
    document.getElementById("admin-content");

const characterForm =
    document.getElementById("character-form");

const imageInput =
    document.getElementById("character-image");

const imagePreview =
    document.getElementById("image-preview");

const characterList =
    document.getElementById("character-list");

const logoutButton =
    document.getElementById("logout-button");

const shopButton =
    document.getElementById("shop-button");

const formTitle =
    document.getElementById("character-form-title");

const submitButton =
    document.getElementById("submit-character-button");

const cancelEditButton =
    document.getElementById("cancel-edit-button");

const currentImageNote =
    document.getElementById("current-image-note");

// =========================
// HELPER
// =========================

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showMessage(
    message,
    type = "success"
) {
    const box =
        document.getElementById(
            "admin-message"
        );

    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;

    box.className =
        "admin-message " + type;

    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 5000);
}

// =========================
// CHECK ADMIN
// =========================

async function checkAdmin() {

    const {
        data: { session },
        error: sessionError
    } = await db.auth.getSession();

    if (sessionError) {

        console.error(sessionError);

        showAccessDenied(
            "Không thể kiểm tra phiên đăng nhập."
        );

        return false;
    }

    if (!session) {

        showAccessDenied(
            "Bạn chưa đăng nhập. Vui lòng đăng nhập tài khoản admin."
        );

        return false;
    }

    const {
        data: profile,
        error
    } = await db
        .from("profiles")
        .select(
            "id, full_name, role"
        )
        .eq(
            "id",
            session.user.id
        )
        .single();

    if (error) {

        console.error(error);

        showAccessDenied(
            "Không thể kiểm tra quyền tài khoản."
        );

        return false;
    }

    if (profile.role !== "admin") {

        showAccessDenied(
            "Tài khoản này không có quyền admin."
        );

        return false;
    }

    if (accessNotice) {
        accessNotice.style.display =
            "none";
    }

    if (adminContent) {
        adminContent.style.display =
            "block";
    }

    const adminName =
        document.getElementById(
            "admin-name"
        );

    if (adminName) {

        adminName.textContent =
            profile.full_name ||
            session.user.email ||
            "Admin";
    }

    return true;
}

function showAccessDenied(
    message =
        "Bạn không có quyền truy cập trang quản trị."
) {

    if (accessNotice) {

        accessNotice.style.display =
            "block";

        accessNotice.innerHTML = `
            <div style="padding:20px;text-align:center;">

                <h2>
                    Không có quyền truy cập
                </h2>

                <p>
                    ${escapeHtml(message)}
                </p>

                <button
                    type="button"
                    onclick="window.location.href='index.html'"
                >
                    Về trang chủ
                </button>

            </div>
        `;
    }

    if (adminContent) {
        adminContent.style.display =
            "none";
    }
}

// =========================
// IMAGE PREVIEW
// =========================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        function () {

            const file =
                this.files?.[0];

            if (!file) {

                selectedFile = null;

                if (!editingCharacterId) {

                    if (imagePreview) {
                        imagePreview.style.display =
                            "none";

                        imagePreview.src = "";
                    }
                }

                return;
            }

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showMessage(
                    "Vui lòng chọn file hình ảnh.",
                    "error"
                );

                this.value = "";

                selectedFile = null;

                return;
            }

            selectedFile = file;

            const reader =
                new FileReader();

            reader.onload =
                function (event) {

                    if (imagePreview) {

                        imagePreview.src =
                            event.target.result;

                        imagePreview.style.display =
                            "block";
                    }
                };

            reader.readAsDataURL(file);
        }
    );
}

// =========================
// UPLOAD IMAGE
// =========================

async function uploadCharacterImage(
    file
) {

    if (!file) {

        throw new Error(
            "Chưa chọn ảnh."
        );
    }

    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
        "jpg";

    const safeExtension =
        /^[a-z0-9]+$/.test(
            extension
        )
            ? extension
            : "jpg";

    const fileName =
        crypto.randomUUID() +
        "." +
        safeExtension;

    const filePath =
        "characters/" +
        fileName;

    const {
        error: uploadError
    } = await db.storage
        .from(BUCKET)
        .upload(
            filePath,
            file,
            {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            }
        );

    if (uploadError) {

        console.error(
            "Upload error:",
            uploadError
        );

        throw uploadError;
    }

    const {
        data: publicUrlData
    } = db.storage
        .from(BUCKET)
        .getPublicUrl(
            filePath
        );

    if (
        !publicUrlData?.publicUrl
    ) {

        throw new Error(
            "Không lấy được URL ảnh."
        );
    }

    return {
        path: filePath,
        url: publicUrlData.publicUrl
    };
}

// =========================
// GET STORAGE PATH
// =========================

function getStoragePathFromUrl(
    imageUrl
) {

    if (!imageUrl) {
        return null;
    }

    try {

        const marker =
            `/storage/v1/object/public/${BUCKET}/`;

        const index =
            imageUrl.indexOf(
                marker
            );

        if (index === -1) {
            return null;
        }

        return decodeURIComponent(
            imageUrl.substring(
                index +
                marker.length
            )
        );

    } catch (error) {

        console.error(
            "Không thể lấy storage path:",
            error
        );

        return null;
    }
}

// =========================
// RESET FORM
// =========================

function resetCharacterForm() {

    editingCharacterId = null;

    editingCharacterImageUrl =
        null;

    selectedFile = null;

    if (characterForm) {
        characterForm.reset();
    }

    const activeCheckbox =
        document.getElementById(
            "character-active"
        );

    if (activeCheckbox) {
        activeCheckbox.checked = true;
    }

    if (imageInput) {
        imageInput.value = "";
    }

    if (imagePreview) {

        imagePreview.src = "";

        imagePreview.style.display =
            "none";
    }

    if (currentImageNote) {
        currentImageNote.style.display =
            "none";
    }

    if (formTitle) {

        formTitle.textContent =
            "➕ Thêm nhân vật";

        formTitle.classList.remove(
            "edit-mode-title"
        );
    }

    if (submitButton) {

        submitButton.textContent =
            "Upload ảnh & lưu nhân vật";
    }

    if (cancelEditButton) {

        cancelEditButton.style.display =
            "none";
    }
}

// =========================
// EDIT CHARACTER
// =========================

function editCharacter(id) {

    const character =
        charactersCache.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!character) {

        showMessage(
            "Không tìm thấy nhân vật.",
            "error"
        );

        return;
    }

    editingCharacterId =
        character.id;

    editingCharacterImageUrl =
        character.image_url ||
        null;

    selectedFile = null;

    // =====================
    // FILL FORM
    // =====================

    const nameInput =
        document.getElementById(
            "character-name"
        );

    const categoryInput =
        document.getElementById(
            "character-category"
        );

    const addressInput =
        document.getElementById(
            "character-address"
        );

    const descriptionInput =
        document.getElementById(
            "character-description"
        );

    const itemsInput =
        document.getElementById(
            "character-items"
        );

    const activeInput =
        document.getElementById(
            "character-active"
        );

    if (nameInput) {
        nameInput.value =
            character.name || "";
    }

    if (categoryInput) {
        categoryInput.value =
            character.category || "";
    }

    if (addressInput) {
        addressInput.value =
            character.address || "";
    }

    if (descriptionInput) {
        descriptionInput.value =
            character.description || "";
    }

    if (itemsInput) {

        const items =
            Array.isArray(
                character.included_items
            )
                ? character.included_items
                : [];

        itemsInput.value =
            items.join("\n");
    }

    if (activeInput) {

        activeInput.checked =
            character.is_active !== false;
    }

    // =====================
    // CURRENT IMAGE
    // =====================

    if (character.image_url) {

        if (imagePreview) {

            imagePreview.src =
                character.image_url;

            imagePreview.style.display =
                "block";
        }

        if (currentImageNote) {

            currentImageNote.style.display =
                "block";

            currentImageNote.textContent =
                "Đang sử dụng ảnh hiện tại. " +
                "Chọn ảnh mới nếu muốn thay ảnh.";
        }
    }

    // =====================
    // EDIT UI
    // =====================

    if (formTitle) {

        formTitle.textContent =
            "✏️ Sửa nhân vật";

        formTitle.classList.add(
            "edit-mode-title"
        );
    }

    if (submitButton) {

        submitButton.textContent =
            "💾 Lưu thay đổi";
    }

    if (cancelEditButton) {

        cancelEditButton.style.display =
            "block";
    }

    // Cuộn lên form
    if (characterForm) {

        characterForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// =========================
// CANCEL EDIT
// =========================

if (cancelEditButton) {

    cancelEditButton.addEventListener(
        "click",
        function () {

            resetCharacterForm();

            showMessage(
                "Đã hủy chỉnh sửa.",
                "success"
            );
        }
    );
}

// =========================
// SAVE / ADD CHARACTER
// =========================

if (characterForm) {

    characterForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    editingCharacterId
                        ? "Đang lưu thay đổi..."
                        : "Đang upload...";
            }

            let uploadedImage = null;

            try {

                const name =
                    document
                        .getElementById(
                            "character-name"
                        )
                        ?.value
                        .trim();

                const category =
                    document
                        .getElementById(
                            "character-category"
                        )
                        ?.value
                        .trim();

                const address =
                    document
                        .getElementById(
                            "character-address"
                        )
                        ?.value
                        .trim();

                const description =
                    document
                        .getElementById(
                            "character-description"
                        )
                        ?.value
                        .trim();

                const includedText =
                    document
                        .getElementById(
                            "character-items"
                        )
                        ?.value
                        .trim();

                const isActive =
                    document
                        .getElementById(
                            "character-active"
                        )
                        ?.checked ??
                    true;

                // =====================
                // VALIDATE
                // =====================

                if (!name) {

                    throw new Error(
                        "Vui lòng nhập tên nhân vật."
                    );
                }

                if (!category) {

                    throw new Error(
                        "Vui lòng nhập thể loại."
                    );
                }

                if (!address) {

                    throw new Error(
                        "Vui lòng nhập địa chỉ."
                    );
                }

                // =====================
                // INCLUDED ITEMS
                // =====================

                const includedItems =
                    includedText
                        ? includedText
                            .split("\n")
                            .map(
                                item =>
                                    item.trim()
                            )
                            .filter(Boolean)
                        : [];

                // =================================================
                // EDIT
                // =================================================

                if (editingCharacterId) {

                    // ---------------------
                    // Nếu chọn ảnh mới
                    // ---------------------

                    if (selectedFile) {

                        uploadedImage =
                            await uploadCharacterImage(
                                selectedFile
                            );

                        if (submitButton) {

                            submitButton.textContent =
                                "Đang cập nhật nhân vật...";
                        }
                    }

                    const updateData = {
                        name: name,
                        category: category,
                        address: address,
                        description:
                            description || null,
                        included_items:
                            includedItems,
                        is_active:
                            isActive
                    };

                    // Chỉ thay image_url
                    // nếu thực sự chọn ảnh mới

                    if (uploadedImage) {

                        updateData.image_url =
                            uploadedImage.url;
                    }

                    const {
                        data: updatedCharacter,
                        error: updateError
                    } = await db
                        .from("characters")
                        .update(
                            updateData
                        )
                        .eq(
                            "id",
                            editingCharacterId
                        )
                        .select()
                        .single();

                    if (updateError) {

                        console.error(
                            "Update error:",
                            updateError
                        );

                        // Rollback ảnh mới
                        if (uploadedImage) {

                            await db.storage
                                .from(BUCKET)
                                .remove([
                                    uploadedImage.path
                                ]);
                        }

                        throw updateError;
                    }

                    // ---------------------
                    // Xóa ảnh cũ
                    // ---------------------

                    if (
                        uploadedImage &&
                        editingCharacterImageUrl
                    ) {

                        const oldImagePath =
                            getStoragePathFromUrl(
                                editingCharacterImageUrl
                            );

                        if (oldImagePath) {

                            const {
                                error:
                                    oldImageDeleteError
                            } =
                                await db.storage
                                    .from(BUCKET)
                                    .remove([
                                        oldImagePath
                                    ]);

                            if (
                                oldImageDeleteError
                            ) {

                                console.warn(
                                    "Không xóa được ảnh cũ:",
                                    oldImageDeleteError
                                );
                            }
                        }
                    }

                    console.log(
                        "Character updated:",
                        updatedCharacter
                    );

                    showMessage(
                        "Đã cập nhật nhân vật thành công!",
                        "success"
                    );

                    resetCharacterForm();

                    await loadCharacters();

                    return;
                }

                // =================================================
                // ADD NEW CHARACTER
                // =================================================

                if (!selectedFile) {

                    throw new Error(
                        "Vui lòng chọn ảnh nhân vật."
                    );
                }

                // Upload ảnh

                uploadedImage =
                    await uploadCharacterImage(
                        selectedFile
                    );

                if (submitButton) {

                    submitButton.textContent =
                        "Đang lưu nhân vật...";
                }

                // Insert database

                const {
                    data: character,
                    error: insertError
                } = await db
                    .from("characters")
                    .insert({
                        name: name,
                        category: category,
                        address: address,
                        description:
                            description || null,
                        image_url:
                            uploadedImage.url,
                        included_items:
                            includedItems,
                        is_active:
                            isActive
                    })
                    .select()
                    .single();

                // Rollback image
                // nếu insert database lỗi

                if (insertError) {

                    console.error(
                        "Character insert error:",
                        insertError
                    );

                    await db.storage
                        .from(BUCKET)
                        .remove([
                            uploadedImage.path
                        ]);

                    throw insertError;
                }

                console.log(
                    "Character created:",
                    character
                );

                showMessage(
                    "Đã thêm nhân vật thành công!",
                    "success"
                );

                resetCharacterForm();

                await loadCharacters();

            } catch (error) {

                console.error(error);

                showMessage(
                    "Có lỗi: " +
                    (
                        error.message ||
                        error
                    ),
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    if (editingCharacterId) {

                        submitButton.textContent =
                            "💾 Lưu thay đổi";

                    } else {

                        submitButton.textContent =
                            "Upload ảnh & lưu nhân vật";
                    }
                }
            }
        }
    );
}

// =========================
// LOAD CHARACTERS
// =========================

async function loadCharacters() {

    if (!characterList) {
        return;
    }

    characterList.innerHTML = `
        <p>Đang tải danh sách nhân vật...</p>
    `;

    const {
        data,
        error
    } = await db
        .from("characters")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(error);

        characterList.innerHTML = `
            <div
                class="admin-message error"
                style="display:block;"
            >
                Không thể tải danh sách nhân vật.
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    charactersCache =
        data || [];

    if (
        !data ||
        data.length === 0
    ) {

        characterList.innerHTML = `
            <p>Chưa có nhân vật nào.</p>
        `;

        return;
    }

    characterList.innerHTML =
        data
            .map(
                character => {

                    const image =
                        character.image_url
                            ? `
                                <img
                                    src="${escapeHtml(
                                        character.image_url
                                    )}"
                                    alt="${escapeHtml(
                                        character.name
                                    )}"
                                    class="admin-character-image"
                                >
                            `
                            : `
                                <div
                                    class="admin-character-no-image"
                                >
                                    Chưa có ảnh
                                </div>
                            `;

                    return `
                        <div
                            class="admin-character-card"
                        >

                            ${image}

                            <div
                                class="admin-character-info"
                            >

                                <h3>
                                    ${escapeHtml(
                                        character.name
                                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        character.category ||
                                        ""
                                    )}
                                </p>

                                <p>
                                    📍 Địa chỉ:
                                    <strong>
                                        ${escapeHtml(
                                            character.address ||
                                            "Chưa cập nhật"
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    Trạng thái:
                                    <b>
                                        ${
                                            character.is_active
                                                ? "Đang hiển thị"
                                                : "Đang ẩn"
                                        }
                                    </b>
                                </p>

                                <div
                                    class="admin-character-actions"
                                >

                                    <button
                                        type="button"
                                        class="edit-character-button"
                                        data-action="edit"
                                        data-id="${escapeHtml(
                                            character.id
                                        )}"
                                    >
                                        ✏️ Sửa
                                    </button>

                                    <button
                                        type="button"
                                        data-action="toggle"
                                        data-id="${escapeHtml(
                                            character.id
                                        )}"
                                    >
                                        ${
                                            character.is_active
                                                ? "Ẩn nhân vật"
                                                : "Hiện nhân vật"
                                        }
                                    </button>

                                    <button
                                        type="button"
                                        class="delete-character-button"
                                        data-action="delete"
                                        data-id="${escapeHtml(
                                            character.id
                                        )}"
                                    >
                                        🗑️ Xóa
                                    </button>

                                </div>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}

// =========================
// BUTTON EVENTS
// =========================

if (characterList) {

    characterList.addEventListener(
        "click",
        async function (event) {

            const button =
                event.target.closest(
                    "button[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;

            if (!id) {
                return;
            }

            if (action === "edit") {

                editCharacter(id);

                return;
            }

            if (action === "toggle") {

                const character =
                    charactersCache.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (!character) {

                    showMessage(
                        "Không tìm thấy nhân vật.",
                        "error"
                    );

                    return;
                }

                await toggleCharacterStatus(
                    character.id,
                    character.is_active
                );

                return;
            }

            if (action === "delete") {

                const character =
                    charactersCache.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (!character) {

                    showMessage(
                        "Không tìm thấy nhân vật.",
                        "error"
                    );

                    return;
                }

                await deleteCharacter(
                    character.id,
                    character.name,
                    character.image_url
                );
            }
        }
    );
}

// =========================
// HIDE / SHOW CHARACTER
// =========================

async function toggleCharacterStatus(
    id,
    currentStatus
) {

    const newStatus =
        !currentStatus;

    const {
        error
    } = await db
        .from("characters")
        .update({
            is_active: newStatus
        })
        .eq(
            "id",
            id
        );

    if (error) {

        console.error(error);

        showMessage(
            "Không thể cập nhật trạng thái: " +
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        newStatus
            ? "Đã hiện nhân vật."
            : "Đã ẩn nhân vật.",
        "success"
    );

    await loadCharacters();
}

// =========================
// DELETE CHARACTER
// =========================

async function deleteCharacter(
    id,
    name,
    imageUrl
) {

    const confirmed =
        confirm(
            `Bạn có chắc muốn xóa "${name}"?\n\n` +
            "Sản phẩm sẽ bị xóa khỏi danh sách shop."
        );

    if (!confirmed) {
        return;
    }

    try {

        // =====================
        // 1. DELETE DATABASE
        // =====================

        const {
            error: deleteError
        } = await db
            .from("characters")
            .delete()
            .eq(
                "id",
                id
            );

        if (deleteError) {

            console.error(
                "Delete character error:",
                deleteError
            );

            throw deleteError;
        }

        // =====================
        // 2. DELETE IMAGE
        // =====================

        const imagePath =
            getStoragePathFromUrl(
                imageUrl
            );

        if (imagePath) {

            const {
                error: storageError
            } = await db.storage
                .from(BUCKET)
                .remove([
                    imagePath
                ]);

            if (storageError) {

                console.warn(
                    "Không xóa được ảnh:",
                    storageError
                );

                showMessage(
                    `Đã xóa "${name}" khỏi shop, ` +
                    "nhưng ảnh trong Storage chưa xóa được.",
                    "error"
                );

            } else {

                showMessage(
                    `Đã xóa "${name}" thành công.`,
                    "success"
                );
            }

        } else {

            showMessage(
                `Đã xóa "${name}" khỏi shop.`,
                "success"
            );
        }

        // =====================
        // 3. REFRESH
        // =====================

        await loadCharacters();

    } catch (error) {

        console.error(error);

        showMessage(
            "Không thể xóa nhân vật: " +
            (
                error.message ||
                error
            ),
            "error"
        );
    }
}

// =========================
// LOGOUT
// =========================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            const {
                error
            } = await db.auth.signOut();

            if (error) {

                console.error(error);

                showMessage(
                    "Đăng xuất thất bại: " +
                    error.message,
                    "error"
                );

                return;
            }

            window.location.href =
                "index.html";
        }
    );
}

// =========================
// GO TO SHOP
// =========================

if (shopButton) {

    shopButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "index.html";
        }
    );
}

// =========================
// AUTH STATE
// =========================

db.auth.onAuthStateChange(
    (event, session) => {

        if (!session) {

            window.location.href =
                "index.html";
        }
    }
);

// =========================
// INIT
// =========================

async function initAdmin() {

    const isAdmin =
        await checkAdmin();

    if (!isAdmin) {
        return;
    }

    await loadCharacters();
}

initAdmin();
