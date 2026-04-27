const navData = document.getElementById("nav-data");
const prevUrl = navData?.dataset.prevUrl || "";
const nextUrl = navData?.dataset.nextUrl || "";

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" && prevUrl) location.href = prevUrl;
  if (e.key === "ArrowRight" && nextUrl) location.href = nextUrl;
});

const addBtn = document.getElementById("add-to-collection-btn");
if (addBtn) {
  const imageIdMatch = location.pathname.match(/\/image\/(\d+)/);
  const imageId = imageIdMatch ? Number(imageIdMatch[1]) : null;
  if (imageId) {
    addBtn.addEventListener("click", () => {
      window.openAddToCollectionModal?.([imageId]);
    });
  }
}
