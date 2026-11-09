// html2canvas ലൈബ്രറി ഓട്ടോമാറ്റിക് ആയി ലോഡ് ചെയ്യുന്നു (ഡൗൺലോഡ് ചെയ്യാൻ)
if (!window.html2canvas) {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  document.head.appendChild(script);
}

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

  // പഴയ പോസ്റ്റർ ഉണ്ടെങ്കിൽ മറയ്ക്കുന്നു
  const oldPoster = document.getElementById("posterContainer");
  if (oldPoster) oldPoster.remove();

  empty.hidden = true;
  output.hidden = true;
  copyBtn.hidden = true;
  errorBox.hidden = true;
  loading.hidden = false;
  btn.disabled = true;
  btn.innerHTML = "<span>✦</span> Creating your ad poster...";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");

    const p = result.poster;

    // പോസ്റ്റർ നിർമ്മിക്കുന്ന HTML കോഡ്
    const posterHTML = `
      <div id="posterContainer" style="margin-bottom: 25px;">
        <div id="posterCard" style="background: linear-gradient(145deg, #ffffff, #fff9e6); border: 4px solid #16a34a; border-radius: 20px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-family: sans-serif; position: relative; overflow: hidden;">
          
          <!-- ഹെഡർ: കടയുടെ പേര് -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #16a34a; padding-bottom: 12px; margin-bottom: 15px;">
            <div>
              <h2 style="margin: 0; color: #15803d; font-size: 26px; font-weight: 900;">🛍️ ${result.business}</h2>
              <p style="margin: 3px 0 0; color: #64748b; font-size: 13px;">Local Business Platform</p>
            </div>
            <div style="background: #dc2626; color: #fff; padding: 6px 14px; border-radius: 25px; font-weight: bold; font-size: 13px; box-shadow: 0 3px 8px rgba(220,38,38,0.4);">
              ${p.offerBadge}
            </div>
          </div>

          <!-- തലക്കെട്ട് -->
          <h3 style="color: #0f172a; font-size: 20px; line-height: 1.4; margin: 0 0 15px; font-weight: 800; text-align: center;">
            ${p.headline}
          </h3>

          <!-- ഫോട്ടോ -->
          <div style="width: 100%; height: 230px; border-radius: 14px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.12);">
            <img src="${result.imageUrl}" alt="Product" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
          </div>

          <!-- സവിശേഷതകൾ (Points with Tick) -->
          <div style="background: rgba(22, 163, 74, 0.08); padding: 12px; border-radius: 12px; margin-bottom: 15px;">
            <div style="color: #1e293b; font-size: 14px; margin-bottom: 6px; font-weight: 600;">✅ ${p.point1}</div>
            <div style="color: #1e293b; font-size: 14px; margin-bottom: 6px; font-weight: 600;">✅ ${p.point2}</div>
            <div style="color: #1e293b; font-size: 14px; font-weight: 600;">✅ ${p.point3}</div>
          </div>

          <!-- കോൾ ടു ആക്ഷൻ ബട്ടൺ (CTA) -->
          <div style="background: #16a34a; color: white; text-align: center; padding: 12px; border-radius: 12px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(22,163,74,0.35);">
            👉 ${p.cta}
          </div>
        </div>

        <!-- ഡൗൺലോഡ് ബട്ടൺ -->
        <button id="downloadPosterBtn" type="button" style="width: 100%; margin-top: 14px; padding: 14px; background: #0284c7; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;">
          📥 Download Poster (ഫോട്ടോയായി സേവ് ചെയ്യുക)
        </button>
      </div>
    `;

    // റിസൾട്ടിന് മുകളിൽ പോസ്റ്റർ കാണിക്കുന്നു
    output.insertAdjacentHTML("beforebegin", posterHTML);

    // ക്യാപ്ഷൻ എഴുത്ത് താഴെ കാണിക്കുന്നു
    output.textContent = p.caption;
    output.hidden = false;
    copyBtn.hidden = false;

    // ഡൗൺലോഡ് ചെയ്യാനുള്ള കോഡ്
    document.getElementById("downloadPosterBtn").addEventListener("click", async () => {
      const card = document.getElementById("posterCard");
      const dlBtn = document.getElementById("downloadPosterBtn");
      dlBtn.textContent = "⏳ തയ്യാറാക്കുന്നു...";
      
      try {
        const canvas = await html2canvas(card, { useCORS: true, scale: 2 });
        const link = document.createElement("a");
        link.download = `${result.business}-poster.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        dlBtn.textContent = "✅ Downloaded!";
        setTimeout(() => dlBtn.textContent = "📥 Download Poster (ഫോട്ടോയായി സേവ് ചെയ്യുക)", 2000);
      } catch (err) {
        alert("പോസ്റ്റർ ഡൗൺലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. സ്ക്രീൻഷോട്ട് എടുക്കാവുന്നതാണ്!");
        dlBtn.textContent = "📥 Download Poster";
      }
    });

  } catch (error) {
    errorBox.textContent = error.message || "Unable to generate poster.";
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
    copyBtn.textContent = "Select text and copy";
  }
});