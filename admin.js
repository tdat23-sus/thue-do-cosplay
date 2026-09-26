const SUPABASE_URL = "https://rydkgmtlmhjftbwukzdn.supabase.co";
const SUPABASE_KEY = "sb_publishable_wIOEpyFJLjH_aWSwnUIF-g_WCvEUOot";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = "character-images";

let selectedFile = null;

// =========================
// DOM
// =========================

const accessNotice = document.getElementById("access-notice");
const adminContent = document.getElementById("admin-content");
const characterForm = document.getElementById("character-form");
const imageInput = document.getElementById("character-image");
const imagePreview = document.getElementById("image-preview");
const characterList = document.getElementById("character-list");
const logoutButton = document.getElementById("logout-button");
const shopButton = document.getElementById("shop-button");

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

function formatPrice(price) {
    return Number(price || 0).toLocaleString("vi-VN") + "đ";
}

function showMessage(message, type = "success") {
    const box = document.getElementById("admin-message");

    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;
    box.className = "admin-message " + type;
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
        showAccessDenied();
        return false;
    }

    if (!session) {
        showAccessDenied("Bạn chưa đăng nhập. Vui lòng đăng nhập tài khoản admin.");
        return false;
    }

    const { data: profile, error } = await db
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", session.user.id)
        .single();

    if (error) {
        console.error(error);
        showAccessDenied("Không thể kiểm tra quyền tài khoản.");
        return false;
    }

    if (profile.role !== "admin") {
        showAccessDenied("Tài khoản này không có quyền admin.");
        return false;
    }

    // Hiển thị giao diện admin
    if (accessNotice) {
        accessNotice.style.display = "none";
    }

    if (adminContent) {
        adminContent.style.display = "block";
    }

    const adminName = document.getElementById("admin-name");

    if (adminName) {
        adminName.textContent =
            profile.full_name ||
            session.user.email ||
            "Admin";
    }

    return true;
}

function showAccessDenied(message = "Bạn không có quyền truy cập trang quản trị.") {
    if (accessNotice) {
        accessNotice.style.display = "block";
        accessNotice.innerHTML = `
            <div style="padding:20px;text-align:center;">
                <h2>Không có quyền truy cập</h2>
                <p>${escapeHtml(message)}</p>
                <button onclick="window.location.href='index.html'">
                    Về trang chủ
                </button>
            </div>
        `;
    }

    if (adminContent) {
        adminContent.style.display = "none";
    }
}

// =========================
// IMAGE PREVIEW
// =========================

if (imageInput) {
    imageInput.addEventListener("change", function () {
        const file = this.files?.[0];

        if (!file) {
            selectedFile = null;

            if (imagePreview) {
                imagePreview.style.display = "none";
                imagePreview.src = "";
            }

            return;
        }

        // Chỉ nhận hình ảnh
        if (!file.type.startsWith("image/")) {
            showMessage("Vui lòng chọn file hình ảnh.", "error");
            this.value = "";
            selectedFile = null;
            return;
        }

        selectedFile = file;

        const reader = new FileReader();

        reader.onload = function (event) {
            if (imagePreview) {
                imagePreview.src = event.target.result;
                imagePreview.style.display = "block";
            }
        };

        reader.readAsDataURL(file);
    });
}

// =========================
// UPLOAD IMAGE
// =========================

async function uploadCharacterImage(file) {
    if (!file) {
        throw new Error("Chưa chọn ảnh.");
    }

    const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension =
        /^[a-z0-9]+$/.test(extension)
            ? extension
            : "jpg";

    const fileName =
        crypto.randomUUID() + "." + safeExtension;

    const filePath = "characters/" + fileName;

    const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
    }

    const {
        data: publicUrlData
    } = db.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
        throw new Error("Không lấy được URL ảnh.");
    }

    return {
        path: filePath,
        url: publicUrlData.publicUrl
    };
}

// =========================
// ADD CHARACTER
// =========================

if (characterForm) {
    characterForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton =
            characterForm.querySelector("button[type='submit']");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Đang upload...";
        }

        try {
            const name =
                document.getElementById("character-name")?.value.trim();

            const category =
                document.getElementById("character-category")?.value.trim();

            const price =
                Number(
                    document.getElementById("character-price")?.value || 0
                );

            const description =
                document.getElementById("character-description")?.value.trim();

            const includedText =
                document.getElementById("character-items")?.value.trim();

            const isActive =
                document.getElementById("character-active")?.checked ?? true;

            // Kiểm tra dữ liệu
            if (!name) {
                throw new Error("Vui lòng nhập tên nhân vật.");
            }

            if (!category) {
                throw new Error("Vui lòng nhập thể loại.");
            }

            if (!price || price < 0) {
                throw new Error("Vui lòng nhập giá thuê hợp lệ.");
            }

            if (!selectedFile) {
                throw new Error("Vui lòng chọn ảnh nhân vật.");
            }

            // Danh sách phụ kiện
            const includedItems = includedText
                ? includedText
                    .split("\n")
                    .map(item => item.trim())
                    .filter(Boolean)
                : [];

            // Upload ảnh
            const uploaded = await uploadCharacterImage(selectedFile);

            if (submitButton) {
                submitButton.textContent = "Đang lưu nhân vật...";
            }

            // Lưu nhân vật vào database
            const { data: character, error: insertError } =
                await db
                    .from("characters")
                    .insert({
                        name: name,
                        category: category,
                        description: description || null,
                        price_per_day: price,
                        image_url: uploaded.url,
                        included_items: includedItems,
                        is_active: isActive
                    })
                    .select()
                    .single();

            if (insertError) {
                console.error("Character insert error:", insertError);

                // Nếu lưu database thất bại,
                // xóa ảnh vừa upload để tránh ảnh rác.
                await db.storage
                    .from(BUCKET)
                    .remove([uploaded.path]);

                throw insertError;
            }

            console.log("Character created:", character);

            showMessage(
                "Đã thêm nhân vật và upload ảnh thành công!",
                "success"
            );

            // Reset form
            characterForm.reset();
            selectedFile = null;

            if (imagePreview) {
                imagePreview.src = "";
                imagePreview.style.display = "none";
            }

            // Tải lại danh sách
            await loadCharacters();

        } catch (error) {
            console.error(error);

            showMessage(
                "Có lỗi: " + (error.message || error),
                "error"
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "Upload ảnh & lưu nhân vật";
            }
        }
    });
}

// =========================
// LOAD CHARACTERS
// =========================

async function loadCharacters() {
    if (!characterList) return;

    characterList.innerHTML = `
        <p>Đang tải danh sách nhân vật...</p>
    `;

    const {
        data,
        error
    } = await db
        .from("characters")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);

        characterList.innerHTML = `
            <div class="admin-message error">
                Không thể tải danh sách nhân vật.
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {
        characterList.innerHTML = `
            <p>Chưa có nhân vật nào.</p>
        `;

        return;
    }

    characterList.innerHTML = data.map(character => {
        const image = character.image_url
            ? `<img
                src="${escapeHtml(character.image_url)}"
                alt="${escapeHtml(character.name)}"
                class="admin-character-image"
              >`
            : `
                <div class="admin-character-no-image">
                    Chưa có ảnh
                </div>
              `;

        return `
            <div class="admin-character-card">

                ${image}

                <div class="admin-character-info">

                    <h3>
                        ${escapeHtml(character.name)}
                    </h3>

                    <p>
                        ${escapeHtml(character.category || "")}
                    </p>

                    <strong>
                        ${formatPrice(character.price_per_day)}
                        / ngày
                    </strong>

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

                    <button
                        type="button"
                        onclick="toggleCharacterStatus(
                            ${character.id},
                            ${character.is_active}
                        )"
                    >
                        ${
                            character.is_active
                                ? "Ẩn nhân vật"
                                : "Hiện nhân vật"
                        }
                    </button>

                </div>

            </div>
        `;
    }).join("");
}

// =========================
// HIDE / SHOW CHARACTER
// =========================

async function toggleCharacterStatus(id, currentStatus) {

    const newStatus = !currentStatus;

    const {
        error
    } = await db
        .from("characters")
        .update({
            is_active: newStatus
        })
        .eq("id", id);

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
// LOGOUT
// =========================

if (logoutButton) {
    logoutButton.addEventListener("click", async function () {

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

        window.location.href = "index.html";
    });
}

// =========================
// GO TO SHOP
// =========================

if (shopButton) {
    shopButton.addEventListener("click", function () {
        window.location.href = "index.html";
    });
}

// =========================
// AUTH STATE
// =========================

db.auth.onAuthStateChange((event, session) => {

    if (!session) {
        window.location.href = "index.html";
    }

});

// =========================
// INIT
// =========================

async function initAdmin() {

    const isAdmin = await checkAdmin();

    if (!isAdmin) {
        return;
    }

    await loadCharacters();
}

initAdmin();