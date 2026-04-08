/* Logic Core: Storytelling Analysis Process
   Handles: Chart rendering, Financial logic, Step-by-step UI unlocking
*/

let cfChart, roiChart;

// Global Chart.js Configuration for Responsiveness
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.font.family = "'Montserrat', sans-serif";

/**
 * Main Controller for the analysis steps
 * @param {number} stepNumber - The ID of the step to reveal
 */
function runStep(stepNumber) {
  const p = parseFloat(document.getElementById("basePrice").value);
  const method = document.getElementById("paymentMethod").value;
  const g = parseFloat(document.getElementById("growthRate").value);

  // 1. Reveal the section
  const currentSection = document.getElementById(`step-${stepNumber}`);
  currentSection.classList.add("step-card-visible");

  // 2. Update UI State (Active Button)
  document
    .querySelectorAll(".btn-step-trigger")
    .forEach((btn) => btn.classList.remove("active-btn"));
  // Note: event is passed implicitly by onclick in HTML
  if (window.event) {
    window.event.currentTarget.classList.add("active-btn");
  }

  // 3. Financial Logic Calculation
  const realPrice = method === "tts" ? p * 0.925 : p; // CK 7.5% cho TTS
  const equity = method === "vay70" ? p * 0.3 : realPrice;

  // 4. Trigger specific render based on step
  switch (stepNumber) {
    case 1:
      renderStep1(p, method, realPrice);
      unlockButton(2);
      break;
    case 2:
      renderStep2(realPrice, g, equity);
      unlockButton(3);
      break;
    case 3:
      renderStep3(realPrice, g, equity);
      break;
  }

  // 5. Smooth Scroll to new content
  const offset = window.innerWidth <= 1024 ? 20 : 60;
  setTimeout(() => {
    const topPos =
      currentSection.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: topPos, behavior: "smooth" });
  }, 100);
}

function unlockButton(num) {
  const btn = document.getElementById(`btn-step-${num}`);
  if (btn) {
    btn.classList.remove("btn-disabled");
    btn.disabled = false;
  }
}

// STEP 1: Dòng tiền (Doughnut Chart)
function renderStep1(p, method, realPrice) {
  const ctx = document.getElementById("cashflowChart").getContext("2d");
  let data, labels;

  if (method === "vay70") {
    data = [0.5, p * 0.15 - 0.5, p * 0.15, p * 0.7];
    labels = ["Cọc", "Vốn tự có 1 (15%)", "Vốn tự có 2 (15%)", "Vốn vay NH"];
  } else {
    data = [0.5, realPrice - 0.5];
    labels = ["Đặt cọc", "Thanh toán đợt cuối"];
  }

  if (cfChart) cfChart.destroy();
  cfChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: ["#0f172a", "#c5a059", "#b8e0d2", "#e2e8f0"],
          borderWidth: 0,
          hoverOffset: 15,
        },
      ],
    },
    options: {
      cutout: "75%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 25, usePointStyle: true, font: { size: 12 } },
        },
      },
    },
  });

  document.getElementById("cfInsight").innerHTML = `
        <p>Tổng vốn đầu tư: <span class="highlight-gold">${realPrice.toFixed(2)} Tỷ</span>.</p>
        <p>Chiến lược này giúp bạn tối ưu hóa dòng tiền, giữ vững cán cân tài chính trong khi vẫn sở hữu một tài sản có <strong>tính thanh khoản cao nhất</strong> khu vực.</p>
    `;
}

// STEP 2: Tăng trưởng (Line Chart)
function renderStep2(realPrice, g, equity) {
  const ctx = document.getElementById("roiChart").getContext("2d");
  const years = [0, 3, 5, 10];
  const values = years.map((y) => realPrice * Math.pow(1 + g / 100, y));

  if (roiChart) roiChart.destroy();
  roiChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: years.map((y) => `Năm ${y}`),
      datasets: [
        {
          label: "Giá trị tài sản",
          data: values,
          borderColor: "#c5a059",
          borderWidth: 4,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#c5a059",
          pointRadius: 6,
          tension: 0.4,
          fill: true,
          backgroundColor: "rgba(184, 224, 210, 0.2)",
        },
      ],
    },
    options: {
      scales: {
        y: {
          grid: { display: false },
          ticks: { display: false },
          border: { display: false },
        },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });

  document.getElementById("roiInsight").innerHTML = `
        <p>Mục tiêu 5 năm: Tài sản đạt mốc <span class="highlight-gold">${values[2].toFixed(2)} Tỷ</span>.</p>
        <p>Sự bùng nổ của hạ tầng Làng Vân sẽ là đòn bẩy kép, đẩy giá trị thặng dư vượt xa mọi kỳ vọng đầu tư truyền thống.</p>
    `;
}

// STEP 3: Kết luận tổng quan
function renderStep3(realPrice, g, equity) {
  const total10Y = realPrice * Math.pow(1 + g / 100, 10);
  const profit = total10Y - realPrice;

  document.getElementById("finalContent").innerHTML = `
        "Thưa Quý khách, con số <strong class="highlight-gold">${profit.toFixed(2)} Tỷ</strong> thặng dư sau 10 năm chỉ là một phần của câu chuyện. 
        Thành công thực sự nằm ở việc Quý khách đã nắm bắt được <span style="border-bottom: 2px solid var(--gold)">vị thế dẫn đầu</span> tại Vịnh biển di sản. 
        Đây là thời điểm để chuyển hóa những con số này thành <strong>tài sản hiện hữu</strong> cho gia đình mình."
    `;
}
