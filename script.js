(function () {
  "use strict";

  // ---------- CONSTANTS & STATE ----------
  const DEPOSIT = 200_000_000;
  let currentBasePrice = 7.4e9;
  let activePlanId = "full";
  let cashflowChart, growthChart, comparisonChart;
  let calcTimeout = null;
  let isLoading = false;

  // DOM elements
  const totalPriceInput = document.getElementById("totalPrice");
  const displayLand = document.getElementById("displayLand");
  const displayBuild = document.getElementById("displayBuild");
  const planSelector = document.getElementById("planSelector");
  const holdingYearsInput = document.getElementById("holdingYears");
  const growthRateInput = document.getElementById("growthRate");
  const rentalYieldInput = document.getElementById("rentalYield");
  const cashflowStartMonthInput = document.getElementById("cashflowStartMonth");
  const calculateBtn = document.getElementById("calculateBtn");
  const resultsPanel = document.getElementById("resultsPanel");
  const selectedPlanTag = document.getElementById("selectedPlanTag");
  const scheduleTableBody = document.getElementById("scheduleTableBody");
  const totalPlanCostSpan = document.getElementById("totalPlanCost");
  const yearsHoldingSpan = document.getElementById("yearsHoldingSpan");
  const futureValueSpan = document.getElementById("futureValue");
  const totalRentalIncomeSpan = document.getElementById("totalRentalIncome");
  const totalCostDisplaySpan = document.getElementById("totalCostDisplay");
  const netProfitSpan = document.getElementById("netProfit");
  const roiPercentageSpan = document.getElementById("roiPercentage");
  const analysisTextDiv = document.getElementById("analysisText");
  const prosTextSpan = document.getElementById("prosText");
  const consTextSpan = document.getElementById("consText");
  const bestPlanRecommendation = document.getElementById(
    "bestPlanRecommendation",
  );
  const validationMsg = document.getElementById("validationMessage");
  const quickComparisonRow = document.getElementById("quickComparisonRow");

  // Plan definitions
  const planDefinitions = [
    {
      id: "full",
      name: "Thanh toán sớm",
      icon: "fa-bolt",
      short: "CK 7.5%",
      defaultStartMonth: 9,
    },
    {
      id: "standard",
      name: "Tiến độ chuẩn",
      icon: "fa-calendar-check",
      short: "Không vay",
      defaultStartMonth: 12,
    },
    {
      id: "deferred24",
      name: "Giãn 24 tháng",
      icon: "fa-hourglass-half",
      short: "+10%",
      defaultStartMonth: 24,
    },
    {
      id: "deferred36",
      name: "Giãn 36 tháng",
      icon: "fa-hourglass-end",
      short: "+15%",
      defaultStartMonth: 36,
    },
    {
      id: "loan70",
      name: "Vay 70%",
      icon: "fa-hand-holding-dollar",
      short: "HTLS 0% 24m",
      defaultStartMonth: 12,
    },
    {
      id: "loan80",
      name: "Vay 80%",
      icon: "fa-coins",
      short: "HTLS 0% 24m",
      defaultStartMonth: 12,
    },
  ];

  // ---------- HELPER: Update land/build display ----------
  function updateLandBuildDisplay() {
    const total = parseFloat(totalPriceInput.value) * 1e9;
    if (isNaN(total) || total <= 0) return;
    currentBasePrice = total;
    displayLand.textContent = ((total * 0.7) / 1e9).toFixed(2);
    displayBuild.textContent = ((total * 0.3) / 1e9).toFixed(2);
  }
  totalPriceInput.addEventListener("input", updateLandBuildDisplay);
  updateLandBuildDisplay();

  // ---------- RENDER PLAN CARDS ----------
  function renderPlanCards() {
    planSelector.innerHTML = "";
    planDefinitions.forEach((def) => {
      const card = document.createElement("label");
      card.className = "plan-card" + (def.id === activePlanId ? " active" : "");
      card.innerHTML = `<input type="radio" name="paymentPlan" value="${def.id}" ${def.id === activePlanId ? "checked" : ""}>
          <div class="plan-icon"><i class="fas ${def.icon}"></i></div>
          <div class="plan-name">${def.name}</div>
          <div class="plan-price">${def.short}</div>`;
      card.addEventListener("click", (e) => {
        if (e.target.tagName !== "INPUT")
          card.querySelector("input").checked = true;
        document
          .querySelectorAll(".plan-card")
          .forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        activePlanId = def.id;
        cashflowStartMonthInput.value = def.defaultStartMonth;
        debouncedRecalculate();
      });
      planSelector.appendChild(card);
    });
  }
  renderPlanCards();

  // ---------- CALCULATION LOGIC (unchanged core) ----------
  function calculatePaymentSchedule(planId, basePrice) {
    const landPrice = basePrice * 0.7;
    const buildPrice = basePrice * 0.3;
    let schedule = [],
      totalCost = 0,
      pros = "",
      cons = "";

    if (planId === "full") {
      const discounted = basePrice * 0.925;
      totalCost = discounted;
      schedule = [
        { phase: "Cọc", amount: DEPOSIT },
        { phase: "15 ngày (50%)", amount: discounted * 0.5 },
        { phase: "30 ngày (50%)", amount: discounted * 0.5 },
      ];
      pros = "Chiết khấu sâu 7.5%, không lãi vay.";
      cons = "Áp lực tài chính lớn ngay đầu.";
    } else if (planId === "standard") {
      totalCost = basePrice;
      schedule = [{ phase: "Cọc", amount: DEPOSIT }];
      [0.15, 0.15, 0.15, 0.15, 0.15, 0.1].forEach((p) =>
        schedule.push({ phase: `Đất - ${p * 100}%`, amount: landPrice * p }),
      );
      schedule.push({
        phase: "Xây dựng (sau 24-36 tháng)",
        amount: buildPrice,
      });
      pros = "Giữ tài sản sớm, trả tiền xây sau.";
      cons = "Không chiết khấu.";
    } else if (planId === "deferred24") {
      totalCost = basePrice * 1.1;
      const landTotal = landPrice * 1.1;
      const monthly = (landTotal - DEPOSIT) / 24;
      schedule = [{ phase: "Cọc", amount: DEPOSIT }];
      for (let i = 1; i <= 24; i++)
        schedule.push({ phase: `Tháng ${i}/24 - Đất`, amount: monthly });
      schedule.push({ phase: "Xây dựng (trả sau)", amount: buildPrice * 1.1 });
      pros = "Dòng tiền nhẹ, trả đều 24 tháng.";
      cons = "Tổng chi phí +10%.";
    } else if (planId === "deferred36") {
      totalCost = basePrice * 1.15;
      const landTotal = landPrice * 1.15;
      const monthly = (landTotal - DEPOSIT) / 36;
      schedule = [{ phase: "Cọc", amount: DEPOSIT }];
      for (let i = 1; i <= 36; i++)
        schedule.push({ phase: `Tháng ${i}/36 - Đất`, amount: monthly });
      schedule.push({ phase: "Xây dựng (trả sau)", amount: buildPrice * 1.15 });
      pros = "Áp lực thấp nhất, trả chậm 36 tháng.";
      cons = "Giá tăng 15%.";
    } else if (planId === "loan70") {
      const loanAmount = basePrice * 0.7,
        ownCapital = basePrice - loanAmount;
      const interest = loanAmount * 0.09 * 3;
      totalCost = basePrice + interest;
      schedule = [
        { phase: "Cọc", amount: DEPOSIT },
        { phase: "Vốn tự có còn lại", amount: ownCapital - DEPOSIT },
        { phase: "Vay NH 70% (0% lãi 24m)", amount: loanAmount },
        {
          phase: "Lãi vay dự kiến (3 năm 9%)",
          amount: interest,
          note: "Ước tính",
        },
      ];
      pros = "Đòn bẩy cao, 2 năm đầu không áp lực.";
      cons = "Sau năm 5 áp lực trả gốc+lãi.";
    } else if (planId === "loan80") {
      const loanAmount = basePrice * 0.8,
        ownCapital = basePrice - loanAmount;
      const interest = loanAmount * 0.09 * 3;
      totalCost = basePrice + interest;
      schedule = [
        { phase: "Cọc", amount: DEPOSIT },
        { phase: "Vốn tự có còn lại", amount: ownCapital - DEPOSIT },
        { phase: "Vay NH 80% (HTLS 0% 24m)", amount: loanAmount },
        {
          phase: "Lãi vay dự kiến (3 năm 9%)",
          amount: interest,
          note: "Ước tính",
        },
      ];
      pros = "Vốn tự có thấp nhất (~1.48 tỷ).";
      cons = "Tổng chi phí cao hơn do lãi vay.";
    }
    return { schedule, totalCost, pros, cons };
  }

  function computeInvestment(
    planId,
    basePrice,
    holdingYears,
    growthRate,
    rentalYieldPercent,
    cashflowStartMonth,
  ) {
    const { schedule, totalCost, pros, cons } = calculatePaymentSchedule(
      planId,
      basePrice,
    );
    const futureValue =
      basePrice * Math.pow(1 + growthRate / 100, holdingYears);
    const monthlyRent = (basePrice * (rentalYieldPercent / 100)) / 12;
    const totalMonths = holdingYears * 12;
    let monthsRentReceived = Math.max(0, totalMonths - cashflowStartMonth);
    const totalRental = monthlyRent * monthsRentReceived;
    const netProfit = futureValue + totalRental - totalCost;
    const roi = (netProfit / totalCost) * 100;
    return {
      schedule,
      totalCost,
      pros,
      cons,
      futureValue,
      totalRental,
      netProfit,
      roi,
      monthlyRent,
    };
  }

  // ---------- VALIDATION ----------
  function validateInputs() {
    let valid = true;
    let msg = "";
    if (
      isNaN(parseFloat(totalPriceInput.value)) ||
      parseFloat(totalPriceInput.value) <= 0
    ) {
      msg = "Giá bán không hợp lệ.";
      valid = false;
    }
    if (parseFloat(holdingYearsInput.value) < 1) {
      msg = "Số năm nắm giữ tối thiểu 1.";
      valid = false;
    }
    validationMsg.textContent = msg;
    return valid;
  }

  // ---------- RENDER UI & CHARTS ----------
  function renderCharts(basePrice, holdingYears, growthRate, monthlyRent) {
    const years = [],
      cashflows = [],
      growthValues = [];
    let val = basePrice;
    for (let y = 1; y <= holdingYears; y++) {
      years.push(`Năm ${y}`);
      cashflows.push(monthlyRent * 12);
      val *= 1 + growthRate / 100;
      growthValues.push(val);
    }
    const ctx1 = document.getElementById("cashflowChart").getContext("2d");
    if (cashflowChart) cashflowChart.destroy();
    cashflowChart = new Chart(ctx1, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Dòng tiền thuê",
            data: cashflows,
            borderColor: "#2a4b7c",
            backgroundColor: "rgba(42,75,124,0.05)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.raw.toFixed(2)} tỷ` },
          },
        },
      },
    });

    const ctx2 = document.getElementById("growthChart").getContext("2d");
    if (growthChart) growthChart.destroy();
    growthChart = new Chart(ctx2, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Giá trị BĐS",
            data: growthValues,
            borderColor: "#0f7b4e",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: { label: (ctx) => `${(ctx.raw / 1e9).toFixed(2)} tỷ` },
          },
        },
      },
    });

    const planIds = [
      "full",
      "standard",
      "deferred24",
      "deferred36",
      "loan70",
      "loan80",
    ];
    const costs = planIds.map(
      (id) => calculatePaymentSchedule(id, basePrice).totalCost / 1e9,
    );
    const ctx3 = document.getElementById("comparisonChart").getContext("2d");
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(ctx3, {
      type: "bar",
      data: {
        labels: ["Full", "Chuẩn", "Giãn24", "Giãn36", "Vay70%", "Vay80%"],
        datasets: [
          {
            label: "Tổng chi phí (tỷ)",
            data: costs,
            backgroundColor: "#3a6b92",
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.raw.toFixed(2)} tỷ` },
          },
        },
      },
    });
  }

  function updateQuickComparison(basePrice) {
    const allPlans = planDefinitions.map((def) => {
      const { totalCost } = calculatePaymentSchedule(def.id, basePrice);
      return { id: def.id, name: def.name, cost: totalCost };
    });
    allPlans.sort((a, b) => a.cost - b.cost);
    const bestCost = allPlans[0];
    let html = `<span style="font-weight:600;"><i class="fas fa-medal"></i> Chi phí thấp nhất: ${bestCost.name} (${(bestCost.cost / 1e9).toFixed(2)} tỷ)</span>`;
    html += ` <span class="comparison-badge badge-best"><i class="fas fa-crown"></i> Tối ưu</span>`;
    quickComparisonRow.innerHTML = html;
  }

  function renderResults(planId) {
    if (!validateInputs()) return;
    const totalPrice = parseFloat(totalPriceInput.value) * 1e9;
    const holdingYears = parseFloat(holdingYearsInput.value) || 5;
    const growthRate = parseFloat(growthRateInput.value) || 8;
    const rentalYield = parseFloat(rentalYieldInput.value) || 5;
    let cashflowStart = parseInt(cashflowStartMonthInput.value);
    if (isNaN(cashflowStart)) cashflowStart = 0;

    const result = computeInvestment(
      planId,
      totalPrice,
      holdingYears,
      growthRate,
      rentalYield,
      cashflowStart,
    );
    const planDef = planDefinitions.find((d) => d.id === planId);
    selectedPlanTag.textContent = `${planDef.name} • ${planDef.short}`;

    let tableHtml = `<tr><th>Giai đoạn</th><th>Số tiền</th></tr>`;
    result.schedule.forEach((item) => {
      tableHtml += `<tr><td>${item.phase} ${item.note ? "<br><small>" + item.note + "</small>" : ""}</td><td>${(item.amount / 1e9).toFixed(3)} tỷ</td></tr>`;
    });
    scheduleTableBody.innerHTML = tableHtml;

    totalPlanCostSpan.textContent = (result.totalCost / 1e9).toFixed(2);
    yearsHoldingSpan.textContent = holdingYears;
    futureValueSpan.textContent = (result.futureValue / 1e9).toFixed(2) + " tỷ";
    totalRentalIncomeSpan.textContent =
      (result.totalRental / 1e9).toFixed(2) + " tỷ";
    totalCostDisplaySpan.textContent =
      (result.totalCost / 1e9).toFixed(2) + " tỷ";
    netProfitSpan.textContent = (result.netProfit / 1e9).toFixed(2) + " tỷ";
    roiPercentageSpan.textContent = result.roi.toFixed(2) + "%";
    prosTextSpan.textContent = result.pros;
    consTextSpan.textContent = result.cons;

    const profit = result.netProfit / 1e9;
    let analysis =
      profit > 0
        ? `✅ Lợi nhuận dương ${profit.toFixed(2)} tỷ, ROI ${result.roi.toFixed(1)}%. `
        : `⚠️ Lợi nhuận âm. `;
    analysis += `Giá trị BĐS sau ${holdingYears} năm đạt ${(result.futureValue / 1e9).toFixed(2)} tỷ.`;
    analysisTextDiv.textContent = analysis;

    const bestCostPlan = planDefinitions
      .map((d) => ({
        id: d.id,
        cost: calculatePaymentSchedule(d.id, totalPrice).totalCost,
      }))
      .sort((a, b) => a.cost - b.cost)[0];
    const bestPlanName = planDefinitions.find(
      (d) => d.id === bestCostPlan.id,
    ).name;
    bestPlanRecommendation.innerHTML = `<i class="fas fa-thumbs-up"></i> Phương án tối ưu chi phí: <strong>${bestPlanName}</strong> (${(bestCostPlan.cost / 1e9).toFixed(2)} tỷ)`;

    renderCharts(totalPrice, holdingYears, growthRate, result.monthlyRent);
    updateQuickComparison(totalPrice);
    resultsPanel.style.display = "block";
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- REAL-TIME + DEBOUNCE ----------
  function debouncedRecalculate() {
    if (calcTimeout) clearTimeout(calcTimeout);
    const btnSpan = calculateBtn.querySelector("span");
    const originalText = btnSpan.textContent;
    btnSpan.innerHTML = `<span class="loading-indicator"></span> Đang tính...`;
    calculateBtn.disabled = true;
    calcTimeout = setTimeout(() => {
      const selectedRadio = document.querySelector(
        'input[name="paymentPlan"]:checked',
      );
      if (selectedRadio) activePlanId = selectedRadio.value;
      renderResults(activePlanId);
      btnSpan.textContent = originalText;
      calculateBtn.disabled = false;
      calcTimeout = null;
    }, 300);
  }

  // Attach real-time listeners
  [
    totalPriceInput,
    holdingYearsInput,
    growthRateInput,
    rentalYieldInput,
    cashflowStartMonthInput,
  ].forEach((el) => el.addEventListener("input", debouncedRecalculate));
  calculateBtn.addEventListener("click", (e) => {
    e.preventDefault();
    debouncedRecalculate();
  });

  // Initialize
  window.addEventListener("load", () => {
    setTimeout(() => {
      renderResults(activePlanId);
    }, 80);
  });
})();
