const toolbar = document.getElementById("bulk-toolbar");
const modal = document.getElementById("bulk-modal");
const confirmBtn = document.getElementById("bulk-confirm-btn");
const cancelBtn = document.getElementById("bulk-cancel-btn");
const form = document.getElementById("bulk-delete-form");

function selectedIds() {
  return [...document.querySelectorAll(".gallery-card__checkbox:checked")].map((cb) =>
    Number(cb.value)
  );
}

function syncToolbar() {
  const ids = selectedIds();
  toolbar.hidden = ids.length === 0;
  document.querySelectorAll(".gallery-card").forEach((card) => {
    const cb = card.querySelector(".gallery-card__checkbox");
    card.classList.toggle("gallery-card--selected", cb?.checked ?? false);
  });
}

document.querySelector(".gallery-grid")?.addEventListener("change", (e) => {
  if (e.target.matches(".gallery-card__checkbox")) syncToolbar();
});

document.getElementById("bulk-select-all")?.addEventListener("click", () => {
  document.querySelectorAll(".gallery-card__checkbox").forEach((cb) => (cb.checked = true));
  syncToolbar();
});

document.getElementById("bulk-clear")?.addEventListener("click", () => {
  document.querySelectorAll(".gallery-card__checkbox").forEach((cb) => (cb.checked = false));
  syncToolbar();
});

document.getElementById("bulk-delete-btn")?.addEventListener("click", () => {
  modal.hidden = false;
});

cancelBtn?.addEventListener("click", () => {
  modal.hidden = true;
});
modal?.addEventListener("click", (e) => {
  if (e.target === modal) modal.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modal.hidden = true;
});

confirmBtn?.addEventListener("click", () => {
  const ids = selectedIds();
  if (ids.length === 0) {
    modal.hidden = true;
    return;
  }
  form.innerHTML = "";
  ids.forEach((id) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "ids";
    input.value = id;
    form.appendChild(input);
  });
  form.submit();
});
