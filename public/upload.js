(function () {
  const zone = document.getElementById("drop-zone");
  const input = document.getElementById("file-input");
  const form = zone.closest("form");

  zone.addEventListener("dragover", function (e) {
    e.preventDefault();
    zone.classList.add("drop-zone--active");
  });

  zone.addEventListener("dragleave", function () {
    zone.classList.remove("drop-zone--active");
  });

  zone.addEventListener("drop", function (e) {
    e.preventDefault();
    zone.classList.remove("drop-zone--active");
    if (e.dataTransfer.files.length > 0) {
      const single = new DataTransfer();
      single.items.add(e.dataTransfer.files[0]);
      input.files = single.files;
      form.submit();
    }
  });

  const label = zone.querySelector('label[for="file-input"]');
  label.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });

  const uploadBtn = document.getElementById("upload-btn");
  const fileName = document.getElementById("file-name");
  input.addEventListener("change", function () {
    uploadBtn.disabled = input.files.length === 0;
    fileName.textContent = input.files.length > 0 ? input.files[0].name : "no file selected";
  });
})();
