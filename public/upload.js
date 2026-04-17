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

  const uploadBtn = document.getElementById("upload-btn");
  input.addEventListener("change", function () {
    uploadBtn.disabled = input.files.length === 0;
  });
})();
