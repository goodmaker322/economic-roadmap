const POLICY_MATRIX = {
  htls70: { 18: 0.035, 24: 0.08, 30: 0.135, 36: 0.195 },
  htls80: { 18: 0.055, 24: 0.105, 30: 0.175, 36: 0.25 },
};

const moneyT = (v) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(v) +
  " Tỷ";

const moneyM = (v) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(v) +
  " Triệu/tháng";

const percent = (v) => `${v.toFixed(1)}%`;

let capitalChart = null;
let cashflowChart = null;
let growthChart = null;
let riskChart = null;

window.addEventListener("load", () => {
  bindEvents();
  setTimeout(() => {
    const loader = document.getElementById("loader");
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
      toggleHTLSFields();
      runAnalysis();
    }, 450);
  }, 700);
});

function bindEvents() {
  document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);

  document.getElementById("investMethod").addEventListener("change", () => {
    toggleHTLSFields();
    runAnalysis();
  });

  document.getElementById("growthRange").addEventListener("input", (e) => {
    document.getElementById("growthLabel").innerText = `${e.target.value}%`;
    runAnalysis();
  });

  document
    .getElementById("stressGrowthRange")
    .addEventListener("input", (e) => {
      document.getElementById("stressGrowthLabel").innerText =
        `${e.target.value}%`;
      runAnalysis();
    });

  [
    "basePrice",
    "htlsTime",
    "floatRate",
    "loanYears",
    "roomCount",
    "rentPerRoom",
    "occupancyRate",
    "operatingCost",
    "applyGifts",
  ].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", runAnalysis);
    el.addEventListener("change", runAnalysis);
  });

  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => activateStep(Number(btn.dataset.step)));
  });
}

function activateStep(step) {
  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.step) === step);
  });

  document.querySelectorAll(".step-panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  const target = document.getElementById(`step-panel-${step}`);
  if (target) {
    target.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toggleHTLSFields() {
  const method = document.getElementById("investMethod").value;
  const isLoan = method.startsWith("htls");
  document.querySelectorAll(".htls-only").forEach((el) => {
    el.style.display = isLoan ? "block" : "none";
  });
}

function calcPolicy(basePrice, method, htlsTime) {
  let finalPrice = basePrice;
  let requiredEquity = basePrice;
  let loanRatio = 0;
  let supportMonths = 0;
  let note = "";

  if (method === "tts") {
    finalPrice = basePrice * (1 - 0.075);
    requiredEquity = finalPrice;
    note = "Thanh toán sớm, chiết khấu trực tiếp 7.5%";
  } else if (method === "gian24") {
    finalPrice = basePrice * 1.1;
    requiredEquity = finalPrice;
    note = "Thanh toán giãn 24 tháng, cộng biên giá 10%";
  } else if (method === "gian36") {
    finalPrice = basePrice * 1.15;
    requiredEquity = finalPrice;
    note = "Thanh toán giãn 36 tháng, cộng biên giá 15%";
  } else if (method.startsWith("htls")) {
    const premium = POLICY_MATRIX[method][htlsTime];
    finalPrice = basePrice * (1 + premium);
    loanRatio = method === "htls70" ? 0.7 : 0.8;
    requiredEquity = finalPrice * (1 - loanRatio);
    supportMonths = Number(htlsTime);
    note = `Vay ${loanRatio * 100}% với HTLS 0% trong ${supportMonths} tháng`;
  }

  return { finalPrice, requiredEquity, loanRatio, supportMonths, note };
}

function calcMonthlyPayment(principalT, annualRate, years) {
  const principalM = principalT * 1000;
  const r = annualRate / 100 / 12;
  const n = years * 12;

  if (n <= 0) return 0;
  if (r === 0) return principalM / n;
  return (principalM * r) / (1 - Math.pow(1 + r, -n));
}

function calcBreakEvenMonths(initialEquityT, netMonthlyM) {
  if (netMonthlyM <= 0) return null;
  return Math.ceil((initialEquityT * 1000) / netMonthlyM);
}

function monthsToYMD(months) {
  if (months === null) return "Chưa hòa vốn";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} năm ${m} tháng 15 ngày`;
}

function runAnalysis() {
  const basePrice = Number(document.getElementById("basePrice").value || 0);
  const method = document.getElementById("investMethod").value;
  const htlsTime = Number(document.getElementById("htlsTime").value || 0);
  const floatRate = Number(document.getElementById("floatRate").value || 0);
  const loanYears = Number(document.getElementById("loanYears").value || 0);
  const growthRate = Number(document.getElementById("growthRange").value || 0);
  const stressGrowthRate = Number(
    document.getElementById("stressGrowthRange").value || 0,
  );
  const roomCount = Number(document.getElementById("roomCount").value || 0);
  const rentPerRoom = Number(document.getElementById("rentPerRoom").value || 0);
  const occupancyRate = Number(
    document.getElementById("occupancyRate").value || 0,
  );
  const operatingCost = Number(
    document.getElementById("operatingCost").value || 0,
  );
  const applyGifts = document.getElementById("applyGifts").checked;

  const policy = calcPolicy(basePrice, method, htlsTime);
  const isLoan = method.startsWith("htls");

  let equityT = policy.requiredEquity;

  if (applyGifts) {
    const giftT = 0.1 + basePrice * 0.009;
    equityT = Math.max(0, equityT - giftT);
  }

  const grossRentM = roomCount * rentPerRoom * (occupancyRate / 100);
  const netOperatingM = grossRentM - operatingCost;
  const loanPrincipalT = isLoan ? policy.finalPrice * policy.loanRatio : 0;
  const monthlyPaymentM = isLoan
    ? calcMonthlyPayment(loanPrincipalT, floatRate, loanYears)
    : 0;
  const netMonthlyAfterDebtM = isLoan
    ? netOperatingM - monthlyPaymentM
    : netOperatingM;

  const asset36T = policy.finalPrice * Math.pow(1 + growthRate / 100, 3);
  const profit36T = asset36T - policy.finalPrice;

  let accumulatedCash36M = 0;
  for (let i = 1; i <= 36; i++) {
    if (isLoan) {
      accumulatedCash36M +=
        i <= policy.supportMonths ? netOperatingM : netMonthlyAfterDebtM;
    } else {
      accumulatedCash36M += netOperatingM;
    }
  }

  const totalReturn36T = profit36T + accumulatedCash36M / 1000;
  const roe = equityT > 0 ? (totalReturn36T / equityT) * 100 : 0;
  const breakEvenMonths = calcBreakEvenMonths(
    equityT,
    isLoan ? netMonthlyAfterDebtM : netOperatingM,
  );

  updateSummary({
    equityT,
    policyNote: policy.note,
    asset36T,
    profit36T,
    netMonthlyAfterDebtM,
    netOperatingM,
    monthlyPaymentM,
    breakEvenMonths,
    roe,
    isLoan,
    supportMonths: policy.supportMonths,
  });

  renderCapitalChart(policy, equityT);
  renderCashflowChart(
    policy.supportMonths,
    netOperatingM,
    monthlyPaymentM,
    isLoan,
  );
  renderGrowthChart(policy.finalPrice, growthRate);
  renderRiskChart(policy.finalPrice, growthRate, stressGrowthRate);

  renderCapitalReport(policy, equityT, isLoan);
  renderCashflowReport(
    netOperatingM,
    monthlyPaymentM,
    netMonthlyAfterDebtM,
    isLoan,
    policy.supportMonths,
  );
  renderGrowthReport(asset36T, profit36T, roe, totalReturn36T);
  renderRiskReport(
    stressGrowthRate,
    floatRate,
    netMonthlyAfterDebtM,
    isLoan,
    breakEvenMonths,
  );
}

function updateSummary(data) {
  document.getElementById("equityVal").innerText = moneyT(data.equityT);
  document.getElementById("policyNote").innerText = data.policyNote;

  document.getElementById("asset36Val").innerText = moneyT(data.asset36T);
  document.getElementById("profit36Val").innerText =
    `Thặng dư tài sản: +${moneyT(data.profit36T)}`;

  document.getElementById("netMonthlyVal").innerText = moneyM(
    data.isLoan ? data.netMonthlyAfterDebtM : data.netOperatingM,
  );

  document.getElementById("loanPressureNote").innerText = data.isLoan
    ? "Đã bao gồm áp lực trả nợ sau HTLS"
    : "Không có nghĩa vụ vay, dòng tiền thuần vận hành";

  document.getElementById("monthlyPaymentVal").innerText = data.isLoan
    ? moneyM(data.monthlyPaymentM)
    : "0 Triệu/tháng";

  document.getElementById("paymentModeNote").innerText = data.isLoan
    ? `Phát sinh sau ${data.supportMonths} tháng HTLS`
    : "Không sử dụng đòn bẩy tín dụng";

  document.getElementById("breakevenVal").innerText = monthsToYMD(
    data.breakEvenMonths,
  );
  document.getElementById("roeVal").innerText = percent(data.roe);

  let finalDecision = "Cần xem thêm";
  if (data.isLoan) {
    if (data.netMonthlyAfterDebtM > 0 && data.roe >= 60)
      finalDecision = "Nên giữ trung hạn";
    else if (data.netMonthlyAfterDebtM > 0)
      finalDecision = "Có thể đầu tư chọn lọc";
    else finalDecision = "Cần cơ cấu lại phương án";
  } else {
    if (data.roe >= 40) finalDecision = "Chiến lược an toàn tốt";
    else finalDecision = "Phù hợp nhà đầu tư phòng thủ";
  }

  document.getElementById("finalDecision").innerText = finalDecision;
}

function renderCapitalChart(policy, equityT) {
  const ctx = document.getElementById("capitalChart").getContext("2d");
  if (capitalChart) capitalChart.destroy();

  const debtPart = policy.finalPrice - policy.requiredEquity;
  const actualEquity = equityT;

  capitalChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Vốn thực tế", "Phần vay / chênh lệch vốn"],
      datasets: [
        {
          data: [actualEquity, Math.max(policy.finalPrice - actualEquity, 0)],
          backgroundColor: ["#4fa9ff", "#dceeff"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      cutout: "68%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#27445f",
            font: { weight: "700" },
          },
        },
      },
    },
  });
}

function renderCashflowChart(
  supportMonths,
  netOperatingM,
  monthlyPaymentM,
  isLoan,
) {
  const ctx = document.getElementById("cashflowChart").getContext("2d");
  if (cashflowChart) cashflowChart.destroy();

  const labels = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
  const operating = labels.map(() => netOperatingM);
  const debt = labels.map((_, i) => {
    if (!isLoan) return 0;
    return i + 1 <= Math.min(supportMonths, 12) ? 0 : monthlyPaymentM;
  });
  const net = operating.map((v, i) => v - debt[i]);

  cashflowChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Dòng tiền khai thác",
          data: operating,
          backgroundColor: "#7ec8ff",
          borderRadius: 10,
        },
        {
          type: "bar",
          label: "Trả nợ ngân hàng",
          data: debt,
          backgroundColor: "#ffb0bf",
          borderRadius: 10,
        },
        {
          type: "line",
          label: "Dòng tiền sau nợ",
          data: net,
          borderColor: "#19b97b",
          backgroundColor: "#19b97b",
          tension: 0.35,
          pointRadius: 4,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#27445f", font: { weight: "700" } },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#7188a3" } },
        y: {
          grid: { color: "rgba(79,169,255,0.08)" },
          ticks: { color: "#7188a3" },
        },
      },
    },
  });
}

function renderGrowthChart(startPrice, growthRate) {
  const ctx = document.getElementById("growthChart").getContext("2d");
  if (growthChart) growthChart.destroy();

  const labels = ["Hiện tại", "Năm 1", "Năm 2", "Năm 3"];
  const values = [
    startPrice,
    startPrice * Math.pow(1 + growthRate / 100, 1),
    startPrice * Math.pow(1 + growthRate / 100, 2),
    startPrice * Math.pow(1 + growthRate / 100, 3),
  ];
  const profit = values.map((v) => v - startPrice);

  growthChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Giá trị tài sản",
          data: values,
          backgroundColor: ["#d7f0ff", "#9fd8ff", "#6fc3ff", "#359eff"],
          borderRadius: 10,
        },
        {
          type: "line",
          label: "Thặng dư",
          data: profit,
          borderColor: "#58d2c8",
          backgroundColor: "#58d2c8",
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.35,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#27445f", font: { weight: "700" } },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#7188a3" } },
        y: {
          grid: { color: "rgba(79,169,255,0.08)" },
          ticks: { color: "#7188a3" },
        },
        y1: {
          position: "right",
          grid: { display: false },
          ticks: { color: "#19b97b" },
        },
      },
    },
  });
}

function renderRiskChart(startPrice, baseGrowth, stressGrowth) {
  const ctx = document.getElementById("riskChart").getContext("2d");
  if (riskChart) riskChart.destroy();

  const labels = ["0", "1Y", "2Y", "3Y", "4Y", "5Y"];
  const base = labels.map(
    (_, i) => startPrice * Math.pow(1 + baseGrowth / 100, i),
  );
  const stress = labels.map(
    (_, i) => startPrice * Math.pow(1 + stressGrowth / 100, i),
  );

  riskChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Kịch bản cơ sở",
          data: base,
          borderColor: "#4fa9ff",
          backgroundColor: "#4fa9ff",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
        },
        {
          label: "Kịch bản thận trọng",
          data: stress,
          borderColor: "#ef647f",
          backgroundColor: "#ef647f",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#27445f", font: { weight: "700" } },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#7188a3" } },
        y: {
          grid: { color: "rgba(79,169,255,0.08)" },
          ticks: { color: "#7188a3" },
        },
      },
    },
  });
}

function renderCapitalReport(policy, equityT, isLoan) {
  const box = document.getElementById("capitalReport");
  box.innerHTML = `
    <p>Khách hàng cần chuẩn bị <strong>${moneyT(equityT)}</strong> vốn tự có thực tế để sở hữu tài sản theo phương án hiện tại.</p>
    <p>Giá vốn sau khi áp dụng chính sách đang ở mức <strong>${moneyT(policy.finalPrice)}</strong>. ${policy.note}.</p>
    <div class="report-block">
      <p><strong>Nhận định:</strong> ${
        isLoan
          ? "Phương án vay giúp giảm áp lực vốn đầu vào và tạo đòn bẩy sở hữu, nhưng cần quản trị kỹ giai đoạn sau hỗ trợ lãi suất."
          : "Phương án không vay phù hợp với khách hàng ưu tiên an toàn vốn, giảm biến động tài chính và kiểm soát rủi ro tốt hơn."
      }</p>
    </div>
  `;
}

function renderCashflowReport(
  netOperatingM,
  monthlyPaymentM,
  netMonthlyAfterDebtM,
  isLoan,
  supportMonths,
) {
  const box = document.getElementById("cashflowReport");
  box.innerHTML = `
    <p>Dòng tiền khai thác ròng trước nợ dự kiến đạt khoảng <strong>${moneyM(netOperatingM)}</strong>.</p>
    <p>${
      isLoan
        ? `Sau ${supportMonths} tháng HTLS, khách hàng sẽ phát sinh nghĩa vụ trả nợ khoảng <strong>${moneyM(monthlyPaymentM)}</strong>, khi đó dòng tiền sau nợ còn lại khoảng <strong>${moneyM(netMonthlyAfterDebtM)}</strong>.`
        : "Do không sử dụng đòn bẩy vay, toàn bộ dòng tiền thuần sẽ được giữ lại để bù vốn và tối ưu hiệu quả khai thác."
    }</p>
    <div class="report-block ${isLoan && netMonthlyAfterDebtM < 0 ? "danger" : ""}">
      <p><strong>Nhận định:</strong> ${
        isLoan
          ? netMonthlyAfterDebtM > 0
            ? "Cấu trúc dòng tiền sau nợ đang ở trạng thái tích cực, phù hợp để tư vấn theo hướng khai thác bền vững."
            : "Dòng tiền sau nợ đang âm, vì vậy cần nhấn mạnh với khách hàng rằng lợi nhuận sẽ phụ thuộc nhiều vào tăng giá tài sản hơn là vận hành."
          : "Dòng tiền vận hành đang là điểm mạnh chính của phương án này."
      }</p>
    </div>
  `;
}

function renderGrowthReport(asset36T, profit36T, roe, totalReturn36T) {
  const box = document.getElementById("growthReport");
  box.innerHTML = `
    <p>Ở kịch bản cơ sở, giá trị tài sản sau 36 tháng dự kiến đạt <strong>${moneyT(asset36T)}</strong>, tạo phần thặng dư tài sản khoảng <strong>${moneyT(profit36T)}</strong>.</p>
    <p>Khi cộng thêm dòng tiền tích lũy, tổng hiệu quả dự phóng của phương án đạt khoảng <strong>${percent(roe)}</strong> trên vốn thực góp.</p>
    <div class="report-block">
      <p><strong>Nhận định:</strong> ${
        roe >= 80
          ? "Hiệu suất vốn nổi bật, có thể tư vấn như một phương án tăng trưởng mạnh."
          : roe >= 40
            ? "Hiệu suất vốn tốt, phù hợp với nhà đầu tư trung hạn."
            : "Hiệu suất vốn ở mức thận trọng, nên tư vấn theo hướng bảo toàn vốn và chọn điểm vào hợp lý."
      }</p>
    </div>
  `;
}

function renderRiskReport(
  stressGrowthRate,
  floatRate,
  netMonthlyAfterDebtM,
  isLoan,
  breakEvenMonths,
) {
  const box = document.getElementById("riskReport");

  let riskText = `
    <p>Trong kịch bản thận trọng, tăng trưởng chỉ còn khoảng <strong>${percent(stressGrowthRate)}</strong>/năm. Khi đó, khách hàng cần theo dõi chặt tốc độ tăng giá, tỷ lệ lấp đầy và chi phí vốn.</p>
  `;

  if (isLoan) {
    riskText += `
      <p>Với lãi suất sau HTLS khoảng <strong>${percent(floatRate)}</strong>, áp lực tài chính sau hỗ trợ sẽ là biến số quan trọng nhất.</p>
      <div class="report-block ${netMonthlyAfterDebtM < 0 ? "danger" : "warn"}">
        <p><strong>Khuyến nghị:</strong> ${
          netMonthlyAfterDebtM > 0
            ? "Có thể tiếp tục nắm giữ nếu công suất khai thác duy trì tốt và thị trường đi đúng kỳ vọng."
            : "Nếu lãi suất duy trì cao và dòng tiền âm kéo dài, nên cân nhắc tái cơ cấu hoặc thanh lý sớm khi thị trường đạt mốc giá phù hợp, tránh gồng lỗ quá sâu."
        }</p>
      </div>
    `;
  } else {
    riskText += `
      <div class="report-block">
        <p><strong>Khuyến nghị:</strong> Phương án không vay có sức phòng thủ tốt hơn, nhưng vẫn cần theo dõi biến động giá bán lại để tối ưu chu kỳ chốt lời.</p>
      </div>
    `;
  }

  riskText += `
    <div class="report-block">
      <p><strong>Điểm hòa vốn dòng tiền:</strong> ${monthsToYMD(breakEvenMonths)}.</p>
    </div>
  `;

  box.innerHTML = riskText;
}
