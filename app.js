const form = document.getElementById("adForm");
const btn = document.getElementById("generateBtn");
const empty = document.getElementById("emptyState");
const loading = document.getElementById("loadingState");
const errorBox = document.getElementById("errorState");
const output = document.getElementById("output");
const copyBtn = document.getElementById("copyBtn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  payload.platforms = data.getAll("platforms");

  // നിലവിലുള്ള ഫോട്ടോ ഉണ്ടെങ്കിൽ മറയ്ക്കുന്നു
  const existingImage = document.getElementById("adImage");
  if (existingImage) existingImage.hidden = true;

  empty.hidden = true;
  output.hidden = true;
  copyBtn.hidden = true;
  errorBox.hidden = true;
  loading.hidden = false;
  btn.disabled = true;
  btn.innerHTML = "<span>✦</span> Creating your ads & image...";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");

    // AI ഫോട്ടോ കാണിക്കാൻ തനിയെ ഒരു Image ബോക്സ് ഉണ്ടാക്കുന്നു
    let adImage = document.getElementById("adImage");
    if (!adImage) {
      adImage = document.createElement("img");
      adImage.id = "adImage";
      adImage.style.width = "100%";
      adImage.style.maxHeight = "400px";
      adImage.style.objectFit = "cover";
      adImage.style.borderRadius = "16px";
      adImage.style.marginBottom = "18px";
      adImage.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
      output.parentNode.insertBefore(adImage, output);
    }

    if (result.imageUrl) {
      adImage.src = result.imageUrl;
      adImage.hidden = false;
    }

    output.textContent = result.text;
    output.hidden = false;
    copyBtn.hidden = false;
  } catch (error) {
    errorBox.textContent = error.message || "Unable to generate ads.";
    errorBox.hidden = false;
  } finally {
    loading.hidden = true;
    btn.disabled = false;
    btn.innerHTML = "<span>✦</span> Generate my ads <b>→</b>";
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.textContent);
    copyBtn.innerHTML = "Copied! <span>✓</span>";
    setTimeout(() => copyBtn.innerHTML = 'Copy all ad text <span>▢</span>', 1800);
  } catch {
    copyBtn.textContent = "Select the text above and copy it";
  }
});