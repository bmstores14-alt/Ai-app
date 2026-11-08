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

  empty.hidden = true;
  output.hidden = true;
  copyBtn.hidden = true;
  errorBox.hidden = true;
  loading.hidden = false;
  btn.disabled = true;
  btn.innerHTML = "<span>✦</span> Creating your ads...";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
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