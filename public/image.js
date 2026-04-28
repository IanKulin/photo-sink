const modal = document.getElementById("confirm-delete");
document.getElementById("open-delete-btn")?.addEventListener("click", () => {
  modal.hidden = false;
});
document.getElementById("cancel-delete-btn")?.addEventListener("click", () => {
  modal.hidden = true;
});
modal?.addEventListener("click", (e) => {
  if (e.target === modal) modal.hidden = true;
});
