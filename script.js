let cfChart, roiChart;

// Cấu hình Chart.js toàn cục để Responsive
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.font.family = "'Montserrat', sans-serif";

function runStep(stepNumber) {
  const p = parseFloat(document.getElementById("basePrice").value);
  const method = document.getElementById("paymentMethod").value;
  const g = parseFloat(document.getElementById("growthRate").value);

  // Kích hoạt Section
  const currentSection = document.getElementById(`step-${stepNumber}`);
  currentSection.classList.add("step-card-visible");

  // Tính toán Logic
  const realPrice = method === "tts" ? p * 0.925 : p;
  const equity = method === "vay70" ? p * 0.3 : realPrice;

  if (stepNumber === 1) {
    renderStep1(p, method, realPrice);
    unlockButton(2);
  } else if (stepNumber === 2) {
    renderStep2(realPrice, g, equity);
    unlockButton(3);
  } else if (stepNumber === 3) {
    renderStep3(realPrice, g, equity);
  }

  // Cuộn mượt đến phần mới
  setTimeout(() => {
    window.scrollTo({ top: currentSection.offsetTop - 50, behavior: "smooth" });
  }, 100);
}

function unlockButton(num) {
  const btn = document.getElementById(`btn-step-${num}`);
  btn.classList.remove("btn-disabled");
  btn.disabled = false;
}

function renderStep1(p, method, realPrice) {
  const ctx = document.getElementById("cashflowChart").getContext("2d");
  const data =
    method === "vay70"
      ? [0.5, p * 0.15 - 0.5, p * 0.15, p * 0.7]
      : [0.5, realPrice - 0.5];
  const labels =
    method === "vay70"
      ? ["Cọc", "Vốn tự có 1", "Vốn tự có 2", "Ngân hàng"]
      : ["Cọc", "Thanh toán"];

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
        },
      ],
    },
    options: {
      cutout: "80%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 20, usePointStyle: true },
        },
      },
    },
  });

  document.getElementById("cfInsight").innerHTML = `
        <p>Với phương thức này, tổng mức đầu tư thực tế là <strong style="color:#c5a059">${realPrice.toFixed(2)} Tỷ</strong>.</p>
        <p>Dòng tiền được thiết kế để <strong>tối ưu hóa lợi nhuận trên vốn tự có</strong>, giúp bạn giữ vững đòn bẩy tài chính trong suốt chu kỳ đầu tư.</p>
    `;
}

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
          data: values,
          borderColor: "#c5a059",
          borderWidth: 4,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#c5a059",
          pointRadius: 6,
          tension: 0.4,
          fill: true,
          backgroundColor: "rgba(184, 224, 210, 0.2)", // Fresh Green Light
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { display: false }, ticks: { display: false } },
        x: { grid: { display: false } },
      },
    },
  });

  document.getElementById("roiInsight").innerHTML = `
        <p>Tại mốc 5 năm, giá trị tài sản dự kiến đạt <strong>${values[2].toFixed(2)} Tỷ</strong>.</p>
        <p>Đây là minh chứng cho tiềm năng tăng trưởng vượt bậc của phân khu Làng Vân khi các hạ tầng du lịch đi vào vận hành đồng bộ.</p>
    `;
}

function renderStep3(realPrice, g, equity) {
  const total10Y = realPrice * Math.pow(1 + g / 100, 10);
  const profit = total10Y - realPrice;

  document.getElementById("finalContent").innerHTML = `
        "Đầu tư vào đây không chỉ là bài toán về những con số <strong>${profit.toFixed(2)} Tỷ</strong> thặng dư. 
        Đó là việc Quý khách đang khẳng định vị thế tại tâm điểm di sản vịnh biển. 
        Với sự đồng hành của chúng tôi, cơ hội này sẽ trở thành <span style="color:#c5a059; font-weight:600">tài sản truyền đời</span> bền vững cho tương lai."
    `;
}
