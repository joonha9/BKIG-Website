/**
 * Deep Analysis section (terminal view-deep-analysis): fetch API and render
 * Altman Z / Piotroski gauges, insider table, revenue chart.
 */
(function () {
  "use strict";

  var altmanChart = null;
  var piotroskiChart = null;
  var beneishChart = null;
  var revenueChart = null;
  var consensusChart = null;
  var altmanSparklineChart = null;
  var piotroskiSparklineChart = null;
  var beneishSparklineChart = null;
  var beneishRadarChart = null;
  var dcfFcfChart = null;
  var valuationFootballChart = null;
  var qualityRoicWaccChart = null;
  var qualityMarginsChart = null;
  var qualityPeerRadarChart = null;
  var capitalAllocationChart = null;
  var capitalPayoutChart = null;
  var capitalNetDebtChart = null;

  function formatValue(val) {
    if (val == null || val === "") return "—";
    var n = Number(val);
    if (isNaN(n)) return String(val);
    if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
    return "$" + n.toFixed(0);
  }

  function renderAltmanGauge(score) {
    var el = document.getElementById("deep-analysis-altman-gauge");
    var labelEl = document.getElementById("deep-analysis-altman-label");
    if (!el) return;
    var val = score != null ? Number(score) : NaN;
    if (isNaN(val)) {
      if (labelEl) labelEl.textContent = "No data";
      return;
    }
    var clamped = Math.max(0, Math.min(5, val));
    var pct = (clamped / 5) * 100;
    var color = "#ef4444";
    if (clamped >= 3) color = "#10b981";
    else if (clamped >= 1.8) color = "#eab308";
    if (typeof ApexCharts === "undefined") {
      if (labelEl) labelEl.textContent = "Z-Score: " + val.toFixed(2) + " (" + (clamped < 1.8 ? "Distress" : clamped < 3 ? "Grey" : "Safe") + ")";
      return;
    }
    if (altmanChart) altmanChart.destroy();
    altmanChart = new ApexCharts(el, {
      chart: { type: "radialBar", height: 220, animations: { enabled: true } },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: "65%" },
          track: { background: "#334155" },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: -10,
              fontSize: "24px",
              color: "#e2e8f0",
              formatter: function () { return val.toFixed(2); }
            }
          }
        }
      },
      fill: { colors: [color] },
      series: [pct],
      labels: [""]
    });
    altmanChart.render();
    if (labelEl) labelEl.textContent = (clamped < 1.8 ? "Distress" : clamped < 3 ? "Grey zone" : "Safe");
  }

  function renderPiotroskiGauge(score) {
    var el = document.getElementById("deep-analysis-piotroski-gauge");
    var labelEl = document.getElementById("deep-analysis-piotroski-label");
    if (!el) return;
    var val = score != null ? Number(score) : NaN;
    if (isNaN(val)) {
      if (labelEl) labelEl.textContent = "No data";
      return;
    }
    var clamped = Math.max(0, Math.min(9, Math.round(val)));
    var pct = (clamped / 9) * 100;
    var color = "#ef4444";
    if (clamped >= 7) color = "#10b981";
    else if (clamped >= 5) color = "#eab308";
    if (typeof ApexCharts === "undefined") {
      if (labelEl) labelEl.textContent = "F-Score: " + clamped + " / 9";
      return;
    }
    if (piotroskiChart) piotroskiChart.destroy();
    piotroskiChart = new ApexCharts(el, {
      chart: { type: "radialBar", height: 220, animations: { enabled: true } },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: "65%" },
          track: { background: "#334155" },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: -10,
              fontSize: "24px",
              color: "#e2e8f0",
              formatter: function () { return clamped; }
            }
          }
        }
      },
      fill: { colors: [color] },
      series: [pct],
      labels: [""]
    });
    piotroskiChart.render();
    if (labelEl) labelEl.textContent = (clamped <= 4 ? "Weak" : clamped <= 6 ? "Neutral" : "Strong");
  }

  function renderBeneishGauge(beneish) {
    var el = document.getElementById("deep-analysis-beneish-gauge");
    var labelEl = document.getElementById("deep-analysis-beneish-label");
    if (!el) return;
    var payload = beneish && typeof beneish === "object" ? beneish : {};
    var val = payload.m_score != null ? Number(payload.m_score) : NaN;
    var status = payload.status || "";
    var label = payload.label || "";
    if (isNaN(val) && !label) {
      if (labelEl) labelEl.textContent = "No data";
      return;
    }
    if (labelEl) labelEl.textContent = label || (isNaN(val) ? "Insufficient Data" : (status === "Risk" ? "High Probability of Manipulation" : "Normal"));
    if (isNaN(val)) return;
    var color = status === "Risk" ? "#ef4444" : "#10b981";
    var displayMin = -3;
    var displayMax = 0;
    var clamped = Math.max(displayMin, Math.min(displayMax, val));
    var pct = ((clamped - displayMin) / (displayMax - displayMin)) * 100;
    if (typeof ApexCharts === "undefined") return;
    if (beneishChart) beneishChart.destroy();
    beneishChart = new ApexCharts(el, {
      chart: { type: "radialBar", height: 220, animations: { enabled: true } },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: { size: "65%" },
          track: { background: "#334155" },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: -10,
              fontSize: "24px",
              color: "#e2e8f0",
              formatter: function () { return val.toFixed(2); }
            }
          }
        }
      },
      fill: { colors: [color] },
      series: [pct],
      labels: [""]
    });
    beneishChart.render();
  }

  function renderSparkline(elId, series, color, existingChartRefSetter, existingChartRefGetter) {
    var el = document.getElementById(elId);
    if (!el || typeof ApexCharts === "undefined") return;

    var data = Array.isArray(series)
      ? series
          .map(function (v) { var n = Number(v); return isNaN(n) ? null : n; })
          .filter(function (v) { return v !== null; })
      : [];

    if (existingChartRefGetter && existingChartRefGetter()) {
      existingChartRefGetter().destroy();
      existingChartRefSetter(null);
    }

    if (!data.length) {
      el.innerHTML = "";
      return;
    }

    var chart = new ApexCharts(el, {
      chart: {
        type: "line",
        height: 60,
        sparkline: { enabled: true },
        animations: { enabled: true },
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      stroke: {
        curve: "smooth",
        width: 2
      },
      colors: [color || "#22c55e"],
      series: [
        { name: "Trend", data: data }
      ],
      tooltip: {
        theme: "dark",
        x: { show: false },
        y: {
          formatter: function (v) {
            return v == null || isNaN(v) ? "—" : v.toFixed(2);
          }
        }
      }
    });

    chart.render();
    if (existingChartRefSetter) existingChartRefSetter(chart);
  }

  function renderAltmanSparkline(trend) {
    renderSparkline(
      "deep-analysis-altman-sparkline",
      trend,
      "#10b981",
      function (chart) { altmanSparklineChart = chart; },
      function () { return altmanSparklineChart; }
    );
  }

  function renderPiotroskiSparkline(trend) {
    renderSparkline(
      "deep-analysis-piotroski-sparkline",
      trend,
      "#38bdf8",
      function (chart) { piotroskiSparklineChart = chart; },
      function () { return piotroskiSparklineChart; }
    );
  }

  function renderBeneishSparkline(trend) {
    renderSparkline(
      "deep-analysis-beneish-sparkline",
      trend,
      "#f97316",
      function (chart) { beneishSparklineChart = chart; },
      function () { return beneishSparklineChart; }
    );
  }

  function renderBeneishRadar(beneish) {
    var el = document.getElementById("deep-analysis-beneish-radar");
    if (!el || typeof ApexCharts === "undefined") return;

    if (beneishRadarChart) {
      beneishRadarChart.destroy();
      beneishRadarChart = null;
    }

    var payload = beneish && typeof beneish === "object" ? beneish : {};
    var components = payload.components && typeof payload.components === "object" ? payload.components : {};

    var labels = ["DSRI", "GMI", "AQI", "SGI", "DEPI", "SGAI", "LVGI", "TATA"];
    var rawValues = labels.map(function (key) {
      var val = components[key] != null ? Number(components[key]) : null;
      return isNaN(val) ? null : val;
    });

    var maxAbs = 0;
    rawValues.forEach(function (v) {
      if (v != null) {
        var a = Math.abs(v);
        if (a > maxAbs) maxAbs = a;
      }
    });
    if (!maxAbs) maxAbs = 1;

    var normalized = rawValues.map(function (v) {
      if (v == null) return 0;
      var scaled = (Math.abs(v) / maxAbs) * 2.0;
      if (scaled > 2) scaled = 2;
      return Number(scaled.toFixed(2));
    });

    var hasAny = normalized.some(function (v) { return v > 0; });
    if (!hasAny) {
      el.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-[220px]\">No Beneish component data.</p>";
      return;
    }

    beneishRadarChart = new ApexCharts(el, {
      chart: {
        type: "radar",
        height: 260,
        toolbar: { show: false }
      },
      series: [
        {
          name: "Beneish Components",
          data: normalized
        }
      ],
      labels: labels,
      yaxis: {
        min: 0,
        max: 2,
        tickAmount: 4,
        labels: {
          show: false
        }
      },
      xaxis: {
        labels: {
          style: {
            colors: Array(labels.length).fill("#cbd5f5")
          }
        }
      },
      stroke: {
        width: 2,
        colors: ["#f97316"]
      },
      fill: {
        opacity: 0.25,
        colors: ["#f97316"]
      },
      markers: {
        size: 3,
        colors: ["#0f172a"],
        strokeColors: "#f97316",
        strokeWidth: 1
      },
      grid: {
        show: true,
        borderColor: "#475569"
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: function (v, opts) {
            var idx = opts.dataPointIndex;
            var label = labels[idx] || "";
            var raw = rawValues[idx];
            if (raw == null || isNaN(raw)) return label + ": —";
            return label + ": " + raw.toFixed(2);
          }
        }
      }
    });

    beneishRadarChart.render();
  }

  function renderForensicRedFlags(forensic) {
    var listEl = document.getElementById("deep-analysis-red-flags");
    if (!listEl) return;

    listEl.innerHTML = "";

    var flags = [];
    var fx = forensic && typeof forensic === "object" ? forensic : {};
    var beneish = fx.beneish && typeof fx.beneish === "object" ? fx.beneish : {};
    var sloan = fx.sloan && typeof fx.sloan === "object" ? fx.sloan : {};

    if (beneish.status === "Risk") {
      flags.push({
        label: "Beneish M-Score flags possible earnings manipulation.",
        detail: beneish.label || "High probability of manipulation."
      });
    }

    var comps = beneish.components && typeof beneish.components === "object" ? beneish.components : {};
    var dsri = comps.DSRI != null ? Number(comps.DSRI) : null;
    if (dsri != null && !isNaN(dsri) && dsri > 1.2) {
      flags.push({
        label: "Receivables growing faster than sales (DSRI > 1.2).",
        detail: "Potential revenue recognition or collection risk."
      });
    }

    var sgai = comps.SGAI != null ? Number(comps.SGAI) : null;
    if (sgai != null && !isNaN(sgai) && sgai > 1.0) {
      flags.push({
        label: "Rising SG&A intensity (SGAI > 1.0).",
        detail: "Overhead growing faster than sales."
      });
    }

    var tata = comps.TATA != null ? Number(comps.TATA) : null;
    if (tata != null && !isNaN(tata) && tata > 0.1) {
      flags.push({
        label: "High accruals (TATA > 0.10).",
        detail: "Earnings rely heavily on non-cash items."
      });
    }

    if (sloan.status === "Risk") {
      flags.push({
        label: "Sloan ratio indicates poor earnings quality.",
        detail: sloan.label || "High accruals relative to assets."
      });
    }

    var cfo = sloan.operating_cash_flow != null ? Number(sloan.operating_cash_flow) : null;
    if (cfo != null && !isNaN(cfo) && cfo < 0) {
      flags.push({
        label: "Negative operating cash flow.",
        detail: "Core operations are not generating cash over the last year."
      });
    }

    if (!flags.length) {
      var li = document.createElement("li");
      li.className = "text-slate-400";
      li.textContent = "No major forensic red flags detected based on available data.";
      listEl.appendChild(li);
      return;
    }

    flags.forEach(function (f) {
      var li = document.createElement("li");
      li.className = "flex items-start gap-2";
      li.innerHTML =
        "<span class=\"mt-1 h-2 w-2 rounded-full bg-rose-500 flex-shrink-0\"></span>" +
        "<span><span class=\"font-medium text-rose-300\">" +
        f.label +
        "</span>" +
        (f.detail ? "<span class=\"block text-xs text-slate-400\">" + f.detail + "</span>" : "") +
        "</span>";
      listEl.appendChild(li);
    });
  }

  function renderSloanCard(sloan) {
    var valueEl = document.getElementById("deep-analysis-sloan-value");
    var labelEl = document.getElementById("deep-analysis-sloan-label");
    var barFill = document.getElementById("deep-analysis-sloan-bar-fill");
    if (!valueEl) return;
    var payload = sloan && typeof sloan === "object" ? sloan : {};
    var ratio = payload.ratio != null ? Number(payload.ratio) : NaN;
    var status = payload.status || "";
    var label = payload.label || "";
    if (labelEl) labelEl.textContent = label || (isNaN(ratio) ? "Insufficient Data" : "");
    if (isNaN(ratio)) {
      valueEl.textContent = "—";
      if (barFill) { barFill.style.width = "0%"; barFill.style.backgroundColor = "#64748b"; }
      return;
    }
    var pct = (ratio * 100).toFixed(1);
    valueEl.textContent = pct + "%";
    if (status === "Risk") {
      valueEl.className = "text-2xl font-semibold text-center mb-1 text-red-400";
    } else if (ratio < -0.10) {
      valueEl.className = "text-2xl font-semibold text-center mb-1 text-emerald-400";
    } else {
      valueEl.className = "text-2xl font-semibold text-center mb-1 text-slate-200";
    }
    if (barFill) {
      var barPct = Math.max(0, Math.min(100, ((ratio + 0.2) / 0.4) * 100));
      barFill.style.width = barPct + "%";
      barFill.style.backgroundColor = status === "Risk" ? "#ef4444" : (ratio < -0.10 ? "#10b981" : "#64748b");
    }
  }

  function renderInsiderTable(insider) {
    var tbody = document.getElementById("deep-analysis-insider-tbody");
    var badge = document.getElementById("deep-analysis-insider-badge");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!Array.isArray(insider) || insider.length === 0) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan=\"5\" class=\"px-4 py-3 text-slate-500\">No insider data</td>";
      tbody.appendChild(tr);
      if (badge) badge.textContent = "";
      return;
    }
    var buys = insider.filter(function (r) { return (r.transactionType || "").toLowerCase() === "buy"; });
    var sells = insider.filter(function (r) { return (r.transactionType || "").toLowerCase() === "sell"; });
    if (badge) {
      if (buys.length > sells.length) {
        badge.innerHTML = "<span class=\"inline-flex items-center px-2.5 py-1 rounded-md text-emerald-400 bg-emerald-900/30\">Insiders are Buying</span>";
      } else if (sells.length > buys.length) {
        badge.innerHTML = "<span class=\"inline-flex items-center px-2.5 py-1 rounded-md text-rose-400 bg-rose-900/30\">Insiders are Selling</span>";
      } else {
        badge.innerHTML = "<span class=\"inline-flex items-center px-2.5 py-1 rounded-md text-slate-400 bg-slate-700/50\">Mixed</span>";
      }
    }
    insider.forEach(function (r) {
      var tr = document.createElement("tr");
      var isBuy = (r.transactionType || "").toLowerCase() === "buy";
      tr.className = isBuy ? "bg-green-900/30" : "bg-red-900/30";
      tr.innerHTML =
        "<td class=\"px-4 py-3 border-b border-slate-700 text-slate-300\">" + (r.date || "—") + "</td>" +
        "<td class=\"px-4 py-3 border-b border-slate-700 text-slate-300\">" + (r.name || "—") + "</td>" +
        "<td class=\"px-4 py-3 border-b border-slate-700 text-slate-400\">" + (r.position || "—") + "</td>" +
        "<td class=\"px-4 py-3 border-b border-slate-700\">" + (r.transactionType || "—") + "</td>" +
        "<td class=\"px-4 py-3 border-b border-slate-700 text-slate-300\">" + formatValue(r.value) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderRevenueChart(years, historical, estimated) {
    var el = document.getElementById("deep-analysis-revenue-chart");
    if (!el || !years || years.length === 0) return;
    var hist = historical || [];
    var est = estimated || [];
    if (typeof ApexCharts === "undefined") return;
    if (revenueChart) revenueChart.destroy();
    revenueChart = new ApexCharts(el, {
      chart: { type: "line", height: 320, animations: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { curve: "smooth", width: [3, 3], dashArray: [0, 5] },
      colors: ["#10b981", "#f43f5e"],
      series: [
        { name: "Historical Revenue", data: hist },
        { name: "Estimated Revenue", data: est }
      ],
      xaxis: { categories: years, labels: { style: { colors: "#94a3b8" } } },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8" },
          formatter: function (v) { return v != null ? v + "B" : ""; }
        }
      },
      legend: { position: "top", labels: { colors: "#94a3b8" } },
      grid: { borderColor: "#475569", strokeDashArray: 4 },
      tooltip: {
        theme: "dark",
        y: { formatter: function (v) { return v != null ? v + "B" : "—"; } }
      },
      dataLabels: { enabled: false }
    });
    revenueChart.render();
  }

  function renderPriceTargetCard(pt) {
    var bar = document.getElementById("deep-analysis-price-target-bar");
    var rangeEl = document.getElementById("deep-analysis-price-target-range");
    var markerCurrent = document.getElementById("deep-analysis-price-target-marker-current");
    var markerConsensus = document.getElementById("deep-analysis-price-target-marker-consensus");
    var lowEl = document.getElementById("deep-analysis-pt-low");
    var highEl = document.getElementById("deep-analysis-pt-high");
    var upsideEl = document.getElementById("deep-analysis-upside-value");
    if (!bar || !lowEl || !highEl) return;
    var low = pt && pt.low != null ? Number(pt.low) : NaN;
    var high = pt && pt.high != null ? Number(pt.high) : NaN;
    var current = (pt && pt.currentPrice != null) ? Number(pt.currentPrice) : NaN;
    var consensus = (pt && (pt.consensus != null || pt.average != null)) ? Number(pt.consensus || pt.average) : NaN;
    var upside = pt && pt.upsidePotentialPct != null ? Number(pt.upsidePotentialPct) : null;
    if (isNaN(low) && isNaN(high)) {
      lowEl.textContent = "No data";
      highEl.textContent = "";
      if (upsideEl) upsideEl.textContent = "—";
      return;
    }
    var minVal = isNaN(low) ? high : (isNaN(high) ? low : Math.min(low, high));
    var maxVal = isNaN(high) ? low : (isNaN(low) ? high : Math.max(low, high));
    if (minVal === maxVal) maxVal = minVal + 1;
    var pct = function (v) { return ((Number(v) - minVal) / (maxVal - minVal)) * 100; };
    lowEl.textContent = "$" + (isNaN(low) ? "—" : low.toFixed(2));
    highEl.textContent = "$" + (isNaN(high) ? "—" : high.toFixed(2));
    if (rangeEl) {
      rangeEl.style.left = "0%";
      rangeEl.style.width = "100%";
    }
    if (markerCurrent && !isNaN(current)) {
      var cp = Math.max(0, Math.min(100, pct(current)));
      markerCurrent.style.left = cp + "%";
      markerCurrent.title = "Current: $" + current.toFixed(2);
    }
    if (markerConsensus && !isNaN(consensus)) {
      var csp = Math.max(0, Math.min(100, pct(consensus)));
      markerConsensus.style.left = csp + "%";
      markerConsensus.title = "Consensus: $" + consensus.toFixed(2);
    }
    if (upsideEl) {
      if (upside != null && !isNaN(upside)) {
        upsideEl.textContent = (upside >= 0 ? "+" : "") + upside.toFixed(1) + "%";
        upsideEl.className = upside >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400";
      } else {
        upsideEl.textContent = "—";
      }
    }
  }

  function renderAnalystRatings(ratings) {
    var dominantEl = document.getElementById("deep-analysis-ratings-dominant");
    var barsEl = document.getElementById("deep-analysis-ratings-bars");
    if (!dominantEl || !barsEl) return;
    if (!ratings || typeof ratings !== "object") {
      dominantEl.textContent = "No data";
      barsEl.innerHTML = "";
      return;
    }
    var labels = [
      { key: "strongBuy", label: "Strong Buy", color: "bg-emerald-600" },
      { key: "buy", label: "Buy", color: "bg-emerald-500/80" },
      { key: "hold", label: "Hold", color: "bg-slate-500" },
      { key: "sell", label: "Sell", color: "bg-rose-500/80" },
      { key: "strongSell", label: "Strong Sell", color: "bg-rose-600" }
    ];
    var total = (ratings.strongBuy || 0) + (ratings.buy || 0) + (ratings.hold || 0) + (ratings.sell || 0) + (ratings.strongSell || 0);
    dominantEl.textContent = ratings.dominant || "—";
    if (total === 0) dominantEl.textContent = "No ratings";
    barsEl.innerHTML = "";
    var maxCount = Math.max(1, ratings.strongBuy || 0, ratings.buy || 0, ratings.hold || 0, ratings.sell || 0, ratings.strongSell || 0);
    labels.forEach(function (item) {
      var count = ratings[item.key] || 0;
      var pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
      var div = document.createElement("div");
      div.className = "flex items-center gap-2";
      div.innerHTML =
        "<span class=\"text-slate-400 text-sm w-24 shrink-0\">" + item.label + "</span>" +
        "<div class=\"flex-1 h-5 rounded bg-slate-600 overflow-hidden\">" +
        "<div class=\"h-full rounded " + item.color + "\" style=\"width:" + pct + "%\"></div></div>" +
        "<span class=\"text-slate-300 text-sm w-8 text-right\">" + count + "</span>";
      barsEl.appendChild(div);
    });
  }

  function hasNum(arr) {
    if (!arr || !arr.length) return false;
    for (var i = 0; i < arr.length; i++) if (arr[i] != null && !isNaN(Number(arr[i]))) return true;
    return false;
  }

  function renderConsensusChart(years, revHist, revEst, epsHist, epsEst) {
    var el = document.getElementById("deep-analysis-consensus-chart");
    if (!el) return;
    if (typeof ApexCharts === "undefined") return;

    var n = (years && years.length) ? years.length : 0;

    function pad(arr, len) {
      var a = arr || [];
      while (a.length < len) a.push(null);
      return a.slice(0, len);
    }

    var rh = pad(revHist, n);
    var re = pad(revEst, n);
    var eh = pad(epsHist, n);
    var ee = pad(epsEst, n);

    function hasNum(arr) {
        if (!arr || !arr.length) return false;
        for (var i = 0; i < arr.length; i++) if (arr[i] != null && !isNaN(Number(arr[i]))) return true;
        return false;
    }

    if (n === 0 || (!hasNum(rh) && !hasNum(re) && !hasNum(eh) && !hasNum(ee))) {
      if (consensusChart) consensusChart.destroy();
      consensusChart = null;
      el.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-[320px]\">No revenue or estimate data for this ticker.</p>";
      return;
    }

    function getMinMax(arr1, arr2) {
        var all = [];
        if (arr1) all = all.concat(arr1);
        if (arr2) all = all.concat(arr2);
        all = all.filter(function(v) { return v != null && !isNaN(v); });

        if (all.length === 0) return { min: 0, max: 10 };
        var min = Math.min.apply(null, all);
        var max = Math.max.apply(null, all);
        var buffer = (max - min) * 0.1;
        if (buffer === 0) buffer = max * 0.1 || 1;
        return { min: min < 0 ? min - buffer : 0, max: max + buffer };
    }

    var revScale = getMinMax(rh, re);
    var epsScale = getMinMax(eh, ee);

    function createYAxis(title, isOpposite, min, max, show) {
        return {
            show: show,
            seriesName: title,
            opposite: isOpposite,
            min: min,
            max: max,
            forceNiceScale: true,
            title: {
                text: show ? title : undefined,
                style: { color: "#94a3b8" }
            },
            labels: {
                show: show,
                style: { colors: "#94a3b8" },
                formatter: function (v) {
                     if (v == null) return "";
                     if (title.indexOf("Revenue") !== -1) return v.toFixed(1) + "B";
                     return "$" + v.toFixed(2);
                }
            }
        };
    }

    // Define 4 Y-axes explicitly to match the 4 Series indices
    var yaxisConfig = [
        createYAxis("Revenue (B)", false, revScale.min, revScale.max, true),
        createYAxis("Revenue (B)", false, revScale.min, revScale.max, false),
        createYAxis("EPS", true, epsScale.min, epsScale.max, true),
        createYAxis("EPS", true, epsScale.min, epsScale.max, false)
    ];

    el.innerHTML = "";
    if (consensusChart) consensusChart.destroy();

    consensusChart = new ApexCharts(el, {
      chart: {
          type: "line",
          height: 320,
          animations: { enabled: true },
          toolbar: { show: false },
          zoom: { enabled: false }
      },
      stroke: {
          curve: "smooth",
          width: [3, 3, 3, 3],
          dashArray: [0, 5, 0, 5]
      },
      colors: ["#10b981", "#34d399", "#f59e0b", "#fbbf24"],
      series: [
        { name: "Revenue (Historical)", data: rh },
        { name: "Revenue (Estimate)", data: re },
        { name: "EPS (Historical)", data: eh },
        { name: "EPS (Estimate)", data: ee }
      ],
      xaxis: {
          categories: years,
          labels: { style: { colors: "#94a3b8" } },
          tooltip: { enabled: false }
      },
      yaxis: yaxisConfig,
      legend: { position: "top", labels: { colors: "#94a3b8" } },
      grid: { borderColor: "#475569", strokeDashArray: 4 },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        x: { show: true },
        y: [
          { formatter: function (v) { return v != null ? v.toFixed(2) + "B" : "—"; } },
          { formatter: function (v) { return v != null ? v.toFixed(2) + "B" : "—"; } },
          { formatter: function (v) { return v != null ? "$" + v.toFixed(2) : "—"; } },
          { formatter: function (v) { return v != null ? "$" + v.toFixed(2) : "—"; } }
        ]
      },
      dataLabels: { enabled: false }
    });

    consensusChart.render();
  }

  /**
   * DCF: project FCF with growth, terminal value, discount to present. Returns { ev, fairValue } or null.
   */
  function computeDCF(fcfDollars, growthPct, waccPct, terminalPct, shares) {
    if (fcfDollars == null || isNaN(fcfDollars) || fcfDollars <= 0 ||
        shares == null || isNaN(shares) || shares <= 0) return null;
    var g = (growthPct == null || isNaN(growthPct) ? 10 : growthPct) / 100;
    var w = (waccPct == null || isNaN(waccPct) ? 10 : waccPct) / 100;
    var tg = (terminalPct == null || isNaN(terminalPct) ? 2.5 : terminalPct) / 100;
    if (w <= tg) return null;
    var ev = 0;
    for (var t = 1; t <= 5; t++) {
      var fcfT = fcfDollars * Math.pow(1 + g, t);
      ev += fcfT / Math.pow(1 + w, t);
    }
    var fcf5 = fcfDollars * Math.pow(1 + g, 5);
    var tv5 = (fcf5 * (1 + tg)) / (w - tg);
    ev += tv5 / Math.pow(1 + w, 5);
    var fairValue = ev / shares;
    return { ev: ev, fairValue: fairValue };
  }

  /**
   * DCF with projected FCF series (nominal) and PV of each + terminal for chart. pvSeries = [PV Y1..Y5], pvTerminal in dollars.
   */
  function getDCFProjections(fcfDollars, growthPct, waccPct, terminalPct) {
    if (fcfDollars == null || isNaN(fcfDollars) || fcfDollars <= 0) return null;
    var g = (growthPct == null || isNaN(growthPct) ? 10 : growthPct) / 100;
    var w = (waccPct == null || isNaN(waccPct) ? 10 : waccPct) / 100;
    var tg = (terminalPct == null || isNaN(terminalPct) ? 2.5 : terminalPct) / 100;
    if (w <= tg) return null;
    var fcfSeries = [];
    var pvSeries = [];
    for (var t = 1; t <= 5; t++) {
      var fcfT = fcfDollars * Math.pow(1 + g, t);
      fcfSeries.push(fcfT);
      pvSeries.push(fcfT / Math.pow(1 + w, t));
    }
    var fcf5 = fcfDollars * Math.pow(1 + g, 5);
    var tv5 = (fcf5 * (1 + tg)) / (w - tg);
    var pvTerminal = tv5 / Math.pow(1 + w, 5);
    var ev = pvSeries.reduce(function (a, b) { return a + b; }, 0) + pvTerminal;
    return { fcfSeries: fcfSeries, pvSeries: pvSeries, pvTerminal: pvTerminal, ev: ev };
  }

  /**
   * Reverse DCF: find implied growth rate g (as %) such that DCF fair value = currentPrice. Binary search.
   */
  function computeImpliedGrowth(fcfDollars, waccPct, terminalPct, shares, currentPrice) {
    if (!fcfDollars || !shares || !currentPrice || currentPrice <= 0) return null;
    var targetEv = currentPrice * shares;
    var w = (waccPct == null || isNaN(waccPct) ? 10 : waccPct) / 100;
    var tg = (terminalPct == null || isNaN(terminalPct) ? 2.5 : terminalPct) / 100;
    if (w <= tg) return null;
    var evAt = function (gPct) {
      var g = gPct / 100;
      var ev = 0;
      for (var t = 1; t <= 5; t++) ev += (fcfDollars * Math.pow(1 + g, t)) / Math.pow(1 + w, t);
      var fcf5 = fcfDollars * Math.pow(1 + g, 5);
      ev += ((fcf5 * (1 + tg)) / (w - tg)) / Math.pow(1 + w, 5);
      return ev;
    };
    var lo = -20;
    var hi = 80;
    for (var iter = 0; iter < 40; iter++) {
      var mid = (lo + hi) / 2;
      var ev = evAt(mid);
      if (ev >= targetEv) lo = mid;
      else hi = mid;
    }
    return Math.round((lo + hi) / 2 * 10) / 10;
  }

  /**
   * Quality of Profit: DuPont with YoY + arrows, Peer Radar, Margins chart, ROIC vs WACC.
   */
  function renderQualityProfit(data) {
    var qp = (data && data.quality_profit) ? data.quality_profit : {};
    var dupont = qp.dupont || {};
    var roicWacc = qp.roic_wacc || {};
    var margins = qp.margins || {};
    var tbody = document.getElementById("dupont-ttm-tbody");
    var alertEl = document.getElementById("dupont-efficiency-alert");
    var roicChartEl = document.getElementById("quality-roic-wacc-chart");
    var marginsChartEl = document.getElementById("quality-margins-chart");
    var radarChartEl = document.getElementById("quality-peer-radar-chart");

    var years = dupont.years || [];
    var roe = dupont.roe || [];
    var netMargin = dupont.net_margin || [];
    var assetTurnover = dupont.asset_turnover || [];
    var equityMult = dupont.equity_multiplier || [];

    function yoyChange(arr, last) {
      if (last < 1 || !arr || arr[last] == null || arr[last - 1] == null) return null;
      return arr[last] - arr[last - 1];
    }
    function arrowHtml(val, isPct) {
      if (val == null || isNaN(val)) return "\u2014";
      var up = val > 0;
      var color = up ? "text-emerald-400" : "text-rose-400";
      var sym = up ? "\u2191" : "\u2193";
      var disp = isPct ? (val >= 0 ? "+" : "") + val.toFixed(1) + "pp" : (val >= 0 ? "+" : "") + val.toFixed(2);
      return "<span class=\"" + color + "\">" + sym + " " + disp + "</span>";
    }

    if (tbody) {
      tbody.innerHTML = "";
      var last = years.length - 1;
      var row = function (label, val, fmt, yoy) {
        var tr = document.createElement("tr");
        tr.className = "border-t border-slate-700";
        var disp = (val != null && !isNaN(val)) ? (fmt === "%" ? val.toFixed(2) + "%" : fmt === "x" ? val.toFixed(2) + "x" : val.toFixed(2)) : "\u2014";
        var yoyDisp = arrowHtml(yoy, fmt === "%");
        tr.innerHTML = "<td class=\"px-2 py-1 text-slate-400\">" + label + "</td><td class=\"px-2 py-1 text-right text-slate-200 font-mono\">" + disp + "</td><td class=\"px-2 py-1 text-right font-mono text-[10px]\">" + yoyDisp + "</td>";
        tbody.appendChild(tr);
      };
      row("ROE", last >= 0 ? roe[last] : null, "%", yoyChange(roe, last));
      row("Net Profit Margin", last >= 0 ? netMargin[last] : null, "%", yoyChange(netMargin, last));
      row("Asset Turnover", last >= 0 ? assetTurnover[last] : null, "x", yoyChange(assetTurnover, last));
      row("Equity Multiplier", last >= 0 ? equityMult[last] : null, "x", yoyChange(equityMult, last));
    }

    if (alertEl) {
      alertEl.classList.add("hidden");
      if (years.length >= 2 && netMargin.length >= 2 && assetTurnover.length >= 2) {
        if (netMargin[last] > netMargin[last - 1] && assetTurnover[last] < assetTurnover[last - 1]) {
          alertEl.textContent = "Efficiency note: Margin up, turnover down — potential efficiency issue.";
          alertEl.classList.remove("hidden");
          alertEl.className = "text-[10px] mt-1.5 text-amber-400";
        }
      }
    }

    if (radarChartEl && typeof ApexCharts !== "undefined") {
      if (qualityPeerRadarChart) { qualityPeerRadarChart.destroy(); qualityPeerRadarChart = null; }
      radarChartEl.innerHTML = "";
      var tickerVal = last >= 0 ? [roe[last] || 0, (roicWacc.roic && roicWacc.roic[roicWacc.roic.length - 1]) || 0, (margins.gross_margin && margins.gross_margin[margins.gross_margin.length - 1]) || 0, netMargin[last] || 0, (assetTurnover[last] || 0) * 100] : [0, 0, 0, 0, 0];
      var industryVal = [12, 10, 38, 8, 90];
      var maxV = Math.max(Math.max.apply(null, tickerVal), Math.max.apply(null, industryVal), 1);
      var norm = function (v) { return Math.min(100, (v / maxV) * 100); };
      qualityPeerRadarChart = new ApexCharts(radarChartEl, {
        chart: { type: "radar", height: 200, toolbar: { show: false } },
        series: [
          { name: "Ticker", data: tickerVal.map(norm) },
          { name: "Industry", data: industryVal.map(norm) }
        ],
        labels: ["ROE", "ROIC", "Gross Margin", "Net Margin", "Asset Turn"],
        stroke: { width: 2 },
        colors: ["#22c55e", "#64748b"],
        fill: { opacity: 0.2 },
        legend: { position: "top", labels: { colors: "#94a3b8" } },
        yaxis: { min: 0, max: 100, tickAmount: 4, labels: { show: false } }
      });
      qualityPeerRadarChart.render();
    }

    if (marginsChartEl && typeof ApexCharts !== "undefined") {
      var mYears = margins.years || [];
      var gm = margins.gross_margin || [];
      var om = margins.operating_margin || [];
      var nm = margins.net_margin || [];
      if (qualityMarginsChart) { qualityMarginsChart.destroy(); qualityMarginsChart = null; }
      marginsChartEl.innerHTML = "";
      if (mYears.length) {
        qualityMarginsChart = new ApexCharts(marginsChartEl, {
          chart: { type: "line", height: 200, toolbar: { show: false }, animations: { enabled: true } },
          stroke: { curve: "smooth", width: 2 },
          colors: ["#60a5fa", "#a78bfa", "#22c55e"],
          series: [
            { name: "Gross Margin", data: gm },
            { name: "Operating Margin", data: om },
            { name: "Net Margin", data: nm }
          ],
          xaxis: { categories: mYears, labels: { style: { colors: "#94a3b8", fontSize: "10px" } } },
          yaxis: { labels: { style: { colors: "#94a3b8" }, formatter: function (v) { return (v != null ? v : 0) + "%"; } } },
          legend: { position: "top", labels: { colors: "#94a3b8" } },
          grid: { borderColor: "#475569", strokeDashArray: 4 },
          tooltip: { theme: "dark", y: { formatter: function (v) { return (v != null ? v : "") + "%"; } } }
        });
        qualityMarginsChart.render();
      } else {
        marginsChartEl.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-full\">No margin data.</p>";
      }
    }

    if (roicChartEl && typeof ApexCharts !== "undefined") {
      var rwYears = roicWacc.years || [];
      var rwRoic = roicWacc.roic || [];
      var rwWacc = roicWacc.wacc || [];
      if (qualityRoicWaccChart) { qualityRoicWaccChart.destroy(); qualityRoicWaccChart = null; }
      roicChartEl.innerHTML = "";
      if (!rwYears.length || (!rwRoic.length && !rwWacc.length)) {
        roicChartEl.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-full\">No ROIC/WACC data.</p>";
      } else {
        var allPct = rwRoic.concat(rwWacc).filter(function (v) { return v != null && !isNaN(v); });
        var yMin = allPct.length ? Math.min.apply(null, allPct) - 2 : 0;
        var yMax = allPct.length ? Math.max.apply(null, allPct) + 2 : 20;
        qualityRoicWaccChart = new ApexCharts(roicChartEl, {
          chart: { type: "line", height: 200, toolbar: { show: false }, animations: { enabled: true } },
          stroke: { curve: "smooth", width: [2.5, 2], dashArray: [0, 5] },
          colors: ["#22c55e", "#ef4444"],
          series: [{ name: "ROIC", data: rwRoic }, { name: "WACC", data: rwWacc }],
          xaxis: { categories: rwYears, labels: { style: { colors: "#94a3b8", fontSize: "10px" } } },
          yaxis: { min: Math.min(yMin, 0), max: yMax, labels: { style: { colors: "#94a3b8" }, formatter: function (v) { return (v != null ? v : 0) + "%"; } } },
          legend: { position: "top", labels: { colors: "#94a3b8" } },
          grid: { borderColor: "#475569", strokeDashArray: 4 },
          tooltip: { theme: "dark", y: { formatter: function (v) { return (v != null ? v : "") + "%"; } } }
        });
        qualityRoicWaccChart.render();
      }
    }
  }

  /**
   * Capital Allocation: 4 summary cards, stacked bar (OCF ref), payout ratio area (100% ref), net debt/EBITDA (3x ref).
   */
  function renderCapitalAllocation(data) {
    var cap = (data && data.capital_allocation) ? data.capital_allocation : {};
    var years = cap.years || [];
    var ocf = cap.ocf || [];
    var capex = cap.capex || [];
    var dividends = cap.dividends || [];
    var buybacks = cap.buybacks || [];
    var acquisitions = cap.acquisitions || [];
    var debtRepay = cap.debt_repay || [];
    var payoutRatio = cap.payout_ratio || [];
    var netDebtEbitda = cap.net_debt_ebitda || [];

    var setText = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val != null && val !== "" ? val : "\u2014";
    };
    setText("capital-div-yield", cap.dividend_yield_pct != null ? cap.dividend_yield_pct.toFixed(2) + "%" : "\u2014");
    setText("capital-buyback-yield", cap.buyback_yield_pct != null ? cap.buyback_yield_pct.toFixed(2) + "%" : "\u2014");
    setText("capital-total-sy", cap.total_sy_pct != null ? cap.total_sy_pct.toFixed(2) + "%" : "\u2014");
    setText("capital-avg-buyback-price", cap.avg_buyback_price_5y != null ? "$" + cap.avg_buyback_price_5y.toFixed(2) : "\u2014");

    var chartEl = document.getElementById("capital-allocation-chart");
    if (chartEl && typeof ApexCharts !== "undefined") {
      if (capitalAllocationChart) { capitalAllocationChart.destroy(); capitalAllocationChart = null; }
      chartEl.innerHTML = "";
      if (years.length) {
        var ocfSeries = ocf.map(function (v) { return v != null ? v : 0; });
        capitalAllocationChart = new ApexCharts(chartEl, {
          chart: { type: "line", height: 240, toolbar: { show: false }, animations: { enabled: true }, stacked: false },
          plotOptions: { bar: { horizontal: false, columnWidth: "70%", stacked: true } },
          stroke: { width: [0, 0, 0, 0, 0, 3], curve: "smooth" },
          colors: ["#64748b", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#fbbf24"],
          dataLabels: { enabled: false },
          series: [
            { name: "CapEx", type: "column", data: capex },
            { name: "Dividends", type: "column", data: dividends },
            { name: "Buybacks", type: "column", data: buybacks },
            { name: "Acquisitions", type: "column", data: acquisitions },
            { name: "Debt Repay", type: "column", data: debtRepay },
            { name: "OCF (ref)", type: "line", data: ocfSeries }
          ],
          xaxis: { categories: years, labels: { style: { colors: "#94a3b8" } } },
          yaxis: { labels: { style: { colors: "#94a3b8" }, formatter: function (v) { return (v != null ? v : 0) + "B"; } } },
          grid: { borderColor: "#475569", strokeDashArray: 4 },
          legend: { position: "top", labels: { colors: "#94a3b8" } },
          tooltip: { theme: "dark", y: { formatter: function (v) { return (v != null ? v : 0) + "B"; } } }
        });
        capitalAllocationChart.render();
      } else {
        chartEl.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-full\">No data.</p>";
      }
    }

    var payoutEl = document.getElementById("capital-payout-ratio-chart");
    if (payoutEl && typeof ApexCharts !== "undefined") {
      if (capitalPayoutChart) { capitalPayoutChart.destroy(); capitalPayoutChart = null; }
      payoutEl.innerHTML = "";
      if (years.length && payoutRatio.some(function (v) { return v != null; })) {
        capitalPayoutChart = new ApexCharts(payoutEl, {
          chart: { type: "area", height: 200, toolbar: { show: false }, animations: { enabled: true } },
          stroke: { curve: "smooth", width: 2 },
          colors: ["#22c55e"],
          fill: { type: "solid", opacity: 0.3 },
          series: [{ name: "Payout %", data: payoutRatio }],
          xaxis: { categories: years, labels: { style: { colors: "#94a3b8", fontSize: "10px" } } },
          yaxis: {
            min: 0,
            labels: { style: { colors: "#94a3b8" }, formatter: function (v) { return (v != null ? v : 0) + "%"; } }
          },
          annotations: {
            yaxis: [{ y: 100, borderColor: "#ef4444", strokeDashArray: 4, borderWidth: 1, label: { text: "100%", style: { color: "#ef4444", fontSize: "10px" } } }]
          },
          grid: { borderColor: "#475569", strokeDashArray: 4 },
          tooltip: { theme: "dark", y: { formatter: function (v) { return (v != null ? v : "") + "%"; } } }
        });
        capitalPayoutChart.render();
      } else {
        payoutEl.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-full\">No payout data.</p>";
      }
    }

    var ndEl = document.getElementById("capital-net-debt-ebitda-chart");
    if (ndEl && typeof ApexCharts !== "undefined") {
      if (capitalNetDebtChart) { capitalNetDebtChart.destroy(); capitalNetDebtChart = null; }
      ndEl.innerHTML = "";
      if (years.length && netDebtEbitda.some(function (v) { return v != null; })) {
        var ndData = netDebtEbitda.map(function (v) { return v != null ? v : 0; });
        capitalNetDebtChart = new ApexCharts(ndEl, {
          chart: { type: "bar", height: 200, toolbar: { show: false }, animations: { enabled: true } },
          plotOptions: { bar: { horizontal: false, columnWidth: "60%", borderRadius: 2 } },
          colors: ["#60a5fa"],
          dataLabels: { enabled: true, formatter: function (v) { return (v != null ? v : 0) + "x"; } },
          series: [{ name: "Net Debt/EBITDA", data: ndData }],
          xaxis: { categories: years, labels: { style: { colors: "#94a3b8", fontSize: "10px" } } },
          yaxis: {
            labels: { style: { colors: "#94a3b8" }, formatter: function (v) { return (v != null ? v : 0) + "x"; } }
          },
          annotations: {
            yaxis: [{ y: 3, borderColor: "#ef4444", strokeDashArray: 4, borderWidth: 1, label: { text: "3x Danger", style: { color: "#ef4444", fontSize: "10px" } } }]
          },
          grid: { borderColor: "#475569", strokeDashArray: 4 },
          tooltip: { theme: "dark", y: { formatter: function (v) { return (v != null ? v : "") + "x"; } } }
        });
        capitalNetDebtChart.render();
      } else {
        ndEl.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-full\">No net debt/EBITDA data.</p>";
      }
    }
  }

  /**
   * Football Field: horizontal range bar (52W, Analyst, DCF Bear/Base/Bull, P/E, EV/EBITDA) + vertical dashed line at current price.
   */
  function renderValuationFootballField(opts) {
    var el = document.getElementById("valuation-football-chart");
    if (!el || typeof ApexCharts === "undefined") return;
    var current = opts.currentPrice != null ? Number(opts.currentPrice) : null;
    var ptLow = opts.ptLow != null ? Number(opts.ptLow) : null;
    var ptHigh = opts.ptHigh != null ? Number(opts.ptHigh) : null;
    var dcfFair = opts.dcfFairValue != null ? Number(opts.dcfFairValue) : null;
    if (current == null || isNaN(current)) current = 100;
    var pad = Math.max(10, current * 0.15);
    var minP = current - pad;
    var maxP = current + pad;
    if (ptLow != null && !isNaN(ptLow)) minP = Math.min(minP, ptLow);
    if (ptHigh != null && !isNaN(ptHigh)) maxP = Math.max(maxP, ptHigh);
    if (dcfFair != null && !isNaN(dcfFair)) {
      minP = Math.min(minP, dcfFair * 0.85);
      maxP = Math.max(maxP, dcfFair * 1.2);
    }
    var dcfBear = dcfFair != null ? dcfFair * 0.85 : minP;
    var dcfBase = dcfFair != null ? dcfFair : current;
    var dcfBull = dcfFair != null ? dcfFair * 1.15 : maxP;
    var range52w = [ptLow != null ? ptLow : minP, ptHigh != null ? ptHigh : maxP];
    var rangeAnalyst = [ptLow != null ? ptLow : minP, ptHigh != null ? ptHigh : maxP];
    var rangeDcf = [dcfBear, dcfBull];
    var rangePe = [current * 0.88, current * 1.25];
    var rangeEv = [current * 0.85, current * 1.22];
    var series = [
      { name: "Range", data: [
        { x: "52W Range", y: [range52w[0], range52w[1]] },
        { x: "Analyst Targets", y: [rangeAnalyst[0], rangeAnalyst[1]] },
        { x: "DCF (Bear/Base/Bull)", y: [rangeDcf[0], rangeDcf[1]] },
        { x: "P/E Multiples", y: [rangePe[0], rangePe[1]] },
        { x: "EV/EBITDA Multiples", y: [rangeEv[0], rangeEv[1]] }
      ] }
    ];
    if (valuationFootballChart) { valuationFootballChart.destroy(); valuationFootballChart = null; }
    el.innerHTML = "";
    valuationFootballChart = new ApexCharts(el, {
      chart: { type: "rangeBar", height: 200, toolbar: { show: false }, animations: { enabled: true } },
      plotOptions: {
        bar: { horizontal: true, barHeight: "55%", rangeBarGroupRows: false, columnWidth: "70%" }
      },
      colors: ["#475569"],
      stroke: { width: 1, colors: ["#64748b"] },
      dataLabels: { enabled: false },
      series: series,
      xaxis: {
        type: "numeric",
        min: minP,
        max: maxP,
        labels: { style: { colors: "#94a3b8", fontSize: "10px" }, formatter: function (v) { return "$" + (v != null ? Number(v).toFixed(0) : ""); } }
      },
      yaxis: {
        labels: { style: { colors: "#94a3b8", fontSize: "10px" } }
      },
      grid: { borderColor: "#334155", strokeDashArray: 2, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
      annotations: {
        xaxis: [{
          x: current,
          strokeDashArray: 4,
          borderColor: "#f59e0b",
          borderWidth: 1.5,
          label: { text: "Current", position: "top", style: { color: "#f59e0b", fontSize: "9px" } }
        }]
      },
      tooltip: { theme: "dark", x: { formatter: function (v) { return "$" + (v != null ? Number(v).toFixed(2) : ""); } } }
    });
    valuationFootballChart.render();
  }

  /**
   * WACC breakdown table (mock data for now).
   */
  function renderWaccBreakdown(waccPct) {
    var tbody = document.getElementById("valuation-wacc-tbody");
    if (!tbody) return;
    var w = (waccPct != null && !isNaN(waccPct)) ? waccPct / 100 : 0.10;
    var rf = 4.5;
    var beta = 1.1;
    var erp = 5.5;
    var ke = (rf / 100) + beta * (erp / 100);
    var kd = 4.0;
    var tax = 25;
    var rows = [
      { label: "Rf", value: rf + "%" },
      { label: "Beta", value: beta.toFixed(2) },
      { label: "ERP", value: erp + "%" },
      { label: "Ke", value: (ke * 100).toFixed(2) + "%" },
      { label: "Kd", value: kd + "%" },
      { label: "Tax", value: tax + "%" }
    ];
    tbody.innerHTML = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td class=\"py-0.5 text-slate-500 pr-1\">" + r.label + "</td><td class=\"py-0.5 text-slate-300 text-right\">" + r.value + "</td>";
      tbody.appendChild(tr);
    });
  }

  /**
   * Peer comps table (mock peers). Highlight current ticker row.
   */
  function renderPeerComps(ticker, currentPrice) {
    var tbody = document.getElementById("valuation-peer-comps-tbody");
    if (!tbody) return;
    var sym = (ticker || "").toUpperCase();
    var mockPeers = [
      { ticker: sym || "TGT", price: currentPrice != null && !isNaN(currentPrice) ? currentPrice : 100, pe: 22.5, evEbitda: 12.0, pb: 4.2, div: 2.1 },
      { ticker: "CVX", price: 148.2, pe: 11.2, evEbitda: 6.5, pb: 1.6, div: 4.2 },
      { ticker: "SHEL", price: 72.5, pe: 8.8, evEbitda: 4.2, pb: 0.9, div: 3.8 },
      { ticker: "BP", price: 38.1, pe: 7.5, evEbitda: 4.0, pb: 1.1, div: 4.5 }
    ];
    if (sym && mockPeers[0].ticker !== sym) mockPeers[0].ticker = sym;
    tbody.innerHTML = "";
    mockPeers.forEach(function (p) {
      var tr = document.createElement("tr");
      var isCurrent = (p.ticker || "").toUpperCase() === sym;
      tr.className = "border-b border-slate-700 " + (isCurrent ? "bg-slate-700/60" : "");
      tr.innerHTML =
        "<td class=\"py-1 px-1 font-medium " + (isCurrent ? "text-amber-400" : "text-slate-300") + "\">" + (p.ticker || "—") + "</td>" +
        "<td class=\"py-1 px-1 text-right text-slate-300\">" + (p.price != null ? "$" + Number(p.price).toFixed(2) : "—") + "</td>" +
        "<td class=\"py-1 px-1 text-right text-slate-300\">" + (p.pe != null ? Number(p.pe).toFixed(1) : "—") + "</td>" +
        "<td class=\"py-1 px-1 text-right text-slate-300\">" + (p.evEbitda != null ? Number(p.evEbitda).toFixed(1) : "—") + "</td>" +
        "<td class=\"py-1 px-1 text-right text-slate-300\">" + (p.pb != null ? Number(p.pb).toFixed(2) : "—") + "</td>" +
        "<td class=\"py-1 px-1 text-right text-slate-300\">" + (p.div != null ? Number(p.div).toFixed(1) + "%" : "—") + "</td>";
      tbody.appendChild(tr);
    });
  }

  /**
   * Render DCF Sensitivity dashboard: sliders, 5x5 heatmap (WACC vs Terminal Growth), FCF bar chart, reverse DCF, football field, WACC, peers.
   */
  function renderDCFCalculator(data) {
    var revSlider = document.getElementById("dcf-rev-growth");
    var waccSlider = document.getElementById("dcf-wacc");
    var termSlider = document.getElementById("dcf-terminal");
    var revValue = document.getElementById("dcf-rev-growth-value");
    var waccValue = document.getElementById("dcf-wacc-value");
    var termValue = document.getElementById("dcf-terminal-value");
    var fairEl = document.getElementById("dcf-fair-value");
    var currentEl = document.getElementById("dcf-current-price");
    var upsideEl = document.getElementById("dcf-upside");
    var noDataEl = document.getElementById("dcf-no-data");
    var impliedEl = document.getElementById("dcf-implied-growth");
    var thead = document.getElementById("dcf-sensitivity-thead");
    var tbody = document.getElementById("dcf-sensitivity-tbody");
    var chartEl = document.getElementById("dcf-fcf-chart");
    if (!revSlider || !waccSlider || !termSlider || !fairEl || !currentEl || !upsideEl) return;

    var fcf = data.dcf_fcf != null ? Number(data.dcf_fcf) : null;
    var waccFromApi = data.dcf_wacc != null ? Number(data.dcf_wacc) : null;
    var shares = data.dcf_shares != null ? Number(data.dcf_shares) : null;
    var currentPrice = data.current_price != null ? Number(data.current_price) : (data.price_target && data.price_target.currentPrice != null ? Number(data.price_target.currentPrice) : null);

    var waccPctDefault = 10;
    if (waccFromApi != null && !isNaN(waccFromApi)) {
      waccPctDefault = waccFromApi <= 1 ? Math.round(waccFromApi * 100 * 100) / 100 : Math.round(waccFromApi * 100) / 100;
      waccPctDefault = Math.max(4, Math.min(20, waccPctDefault));
    }
    waccSlider.value = String(waccPctDefault);
    if (waccValue) waccValue.textContent = waccPctDefault;

    if (noDataEl) noDataEl.classList.toggle("hidden", !!(fcf && shares));
    if (currentEl) currentEl.textContent = currentPrice != null && !isNaN(currentPrice) ? "$" + currentPrice.toFixed(2) : "—";

    var pt = data.price_target && typeof data.price_target === "object" ? data.price_target : {};
    renderValuationFootballField({
      currentPrice: currentPrice,
      ptLow: pt.low,
      ptHigh: pt.high,
      dcfFairValue: null
    });
    renderWaccBreakdown(waccPctDefault);
    renderPeerComps(data.ticker || "", currentPrice);

    function renderSensitivityTable(revPct, waccPct, termPct, fcfUse, sharesUse, currentPx) {
      if (!thead || !tbody || !fcfUse || !sharesUse) return;
      var waccSteps = [waccPct - 2, waccPct - 1, waccPct, waccPct + 1, waccPct + 2];
      var termSteps = [termPct - 1, termPct - 0.5, termPct, termPct + 0.5, termPct + 1];
      thead.innerHTML = "";
      var th0 = document.createElement("th");
      th0.className = "px-1 py-0.5 text-slate-500 text-[10px] font-medium border border-slate-700 bg-slate-800";
      th0.textContent = "WACC \\ Term";
      thead.appendChild(th0);
      termSteps.forEach(function (t) {
        var th = document.createElement("th");
        th.className = "px-1 py-0.5 text-slate-400 text-[10px] border border-slate-700 bg-slate-800";
        th.textContent = t.toFixed(1) + "%";
        thead.appendChild(th);
      });
      tbody.innerHTML = "";
      waccSteps.forEach(function (w, ri) {
        var tr = document.createElement("tr");
        var tdLabel = document.createElement("td");
        tdLabel.className = "px-1 py-0.5 text-slate-400 text-[10px] font-medium border border-slate-700 bg-slate-800";
        tdLabel.textContent = w.toFixed(1) + "%";
        tr.appendChild(tdLabel);
        termSteps.forEach(function (t, ci) {
          var res = computeDCF(fcfUse, revPct, w, t, sharesUse);
          var td = document.createElement("td");
          td.className = "px-1 py-0.5 border border-slate-700 text-slate-200 font-mono text-[10px]";
          if (res && currentPx != null && !isNaN(currentPx)) {
            if (res.fairValue < currentPx) td.style.backgroundColor = "rgba(239, 68, 68, 0.35)";
            else if (res.fairValue > currentPx) td.style.backgroundColor = "rgba(16, 185, 129, 0.35)";
            else td.style.backgroundColor = "rgba(100, 116, 139, 0.5)";
            td.textContent = "$" + res.fairValue.toFixed(1);
            if (ri === 2 && ci === 2) {
              td.style.boxShadow = "inset 0 0 0 1px rgb(251 191 36)";
            }
          } else {
            td.textContent = "—";
            td.style.backgroundColor = "rgba(30, 41, 59, 0.6)";
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    function renderFCFChart(revPct, waccPct, termPct) {
      if (!chartEl || typeof ApexCharts === "undefined") return;
      var proj = getDCFProjections(fcf, revPct, waccPct, termPct);
      if (!proj) {
        if (dcfFcfChart) { dcfFcfChart.destroy(); dcfFcfChart = null; }
        chartEl.innerHTML = "<p class=\"text-slate-500 text-sm flex items-center justify-center h-full\">No FCF data.</p>";
        return;
      }
      var scale = 1;
      var vals = (proj.pvSeries || []).concat([proj.pvTerminal]);
      var maxVal = Math.max.apply(null, vals.filter(function (v) { return isFinite(v); }));
      if (maxVal >= 1e9) scale = 1e9;
      else if (maxVal >= 1e6) scale = 1e6;
      else if (maxVal >= 1e3) scale = 1e3;
      var labels = ["Y1", "Y2", "Y3", "Y4", "Y5", "TV (PV)"];
      var dataArr = (proj.pvSeries || []).map(function (v) { return Math.round((v / scale) * 100) / 100; });
      dataArr.push(Math.round((proj.pvTerminal / scale) * 100) / 100);
      var suffix = scale >= 1e9 ? "B" : scale >= 1e6 ? "M" : scale >= 1e3 ? "K" : "";
      if (dcfFcfChart) { dcfFcfChart.destroy(); dcfFcfChart = null; }
      chartEl.innerHTML = "";
      dcfFcfChart = new ApexCharts(chartEl, {
        chart: { type: "bar", height: 180, toolbar: { show: false }, animations: { enabled: true } },
        plotOptions: {
          bar: { horizontal: false, columnWidth: "65%", distributed: true }
        },
        colors: ["#34d399", "#34d399", "#34d399", "#34d399", "#34d399", "#f59e0b"],
        dataLabels: { enabled: true, formatter: function (v) { return (v != null ? v : 0) + suffix; } },
        series: [{ name: "PV", data: dataArr }],
        xaxis: { categories: labels, labels: { style: { colors: "#94a3b8" } } },
        yaxis: { labels: { style: { colors: "#94a3b8" }, formatter: function (v) { return (v != null ? v : 0) + suffix; } } },
        grid: { borderColor: "#475569", strokeDashArray: 4 },
        legend: { show: false },
        tooltip: { theme: "dark", y: { formatter: function (v) { return (v != null ? v : 0) + suffix + " (PV)"; } } }
      });
      dcfFcfChart.render();
    }

    function updateDCFOutput() {
      var revPct = parseFloat(revSlider.value, 10);
      var waccPct = parseFloat(waccSlider.value, 10);
      var termPct = parseFloat(termSlider.value, 10);
      if (revValue) revValue.textContent = revPct;
      if (waccValue) waccValue.textContent = waccPct;
      if (termValue) termValue.textContent = termPct;

      var fcfUse = fcf;
      var sharesUse = shares;
      if ((fcfUse == null || sharesUse == null) || isNaN(fcfUse) || isNaN(sharesUse) || fcfUse <= 0 || sharesUse <= 0) {
        fairEl.textContent = "—";
        upsideEl.textContent = "—";
        if (upsideEl.classList) { upsideEl.classList.remove("text-emerald-400", "text-rose-400"); upsideEl.classList.add("text-slate-400"); }
        if (impliedEl) impliedEl.textContent = "Implied Revenue Growth to justify Current Price: —";
        if (tbody) tbody.innerHTML = "";
        if (chartEl && !dcfFcfChart) chartEl.innerHTML = "<p class=\"text-slate-500 text-sm\">No FCF data.</p>";
        return;
      }
      var result = computeDCF(fcfUse, revPct, waccPct, termPct, sharesUse);
      if (!result) {
        fairEl.textContent = "—";
        upsideEl.textContent = "—";
        return;
      }
      fairEl.textContent = "$" + result.fairValue.toFixed(2);
      if (currentPrice != null && !isNaN(currentPrice) && currentPrice > 0) {
        var upsidePct = ((result.fairValue - currentPrice) / currentPrice) * 100;
        upsideEl.textContent = (upsidePct >= 0 ? "+" : "") + upsidePct.toFixed(1) + "%";
        upsideEl.className = "text-sm font-medium " + (upsidePct >= 0 ? "text-emerald-400" : "text-rose-400");
      } else {
        upsideEl.textContent = "—";
        upsideEl.className = "text-sm font-medium text-slate-400";
      }
      var implied = computeImpliedGrowth(fcfUse, waccPct, termPct, sharesUse, currentPrice);
      if (impliedEl) impliedEl.textContent = "Implied growth: " + (implied != null ? implied.toFixed(1) + "%" : "—");
      renderSensitivityTable(revPct, waccPct, termPct, fcfUse, sharesUse, currentPrice);
      renderFCFChart(revPct, waccPct, termPct);
      var pt = data.price_target && typeof data.price_target === "object" ? data.price_target : {};
      renderValuationFootballField({
        currentPrice: currentPrice,
        ptLow: pt.low,
        ptHigh: pt.high,
        dcfFairValue: result.fairValue
      });
    }

    revSlider.oninput = updateDCFOutput;
    waccSlider.oninput = updateDCFOutput;
    termSlider.oninput = updateDCFOutput;
    updateDCFOutput();
  }

  /**
   * Switch Deep Analysis tab: show one panel, hide others; update sidebar active state.
   * @param {string} tabName - One of: 'forensic' | 'smart-money' | 'wall-st-consensus' | 'valuation-lab'
   */
  function switchTab(tabName) {
    var action = DEEP_TAB_TO_ACTION[tabName];
    if (action) recordDeepAnalysisUsage(action);

    var panels = document.querySelectorAll(".deep-analysis-panel");
    var tabs = document.querySelectorAll(".deep-analysis-tab");
    var panelId = "view-" + tabName;
    var targetPanel = document.getElementById(panelId);

    panels.forEach(function (panel) {
      if (panel.id === panelId) {
        panel.classList.remove("hidden");
      } else {
        panel.classList.add("hidden");
      }
    });

    tabs.forEach(function (tab) {
      if ((tab.getAttribute("data-deep-tab") || "") === tabName) {
        tab.classList.remove("text-slate-400");
        tab.classList.add("bg-slate-800", "text-emerald-400");
      } else {
        tab.classList.remove("bg-slate-800", "text-emerald-400");
        tab.classList.add("text-slate-400");
      }
    });

    if (targetPanel && tabName === "wall-st-consensus") {
      if (revenueChart) {
        try { revenueChart.updateOptions({}); } catch (e) { /* ignore */ }
      }
      if (consensusChart) {
        var chartEl = document.getElementById("deep-analysis-consensus-chart");
        var chartRef = consensusChart;
        setTimeout(function () {
          try {
            if (!chartRef || !chartEl) return;
            var w = chartEl.clientWidth;
            if (w > 0) chartRef.updateOptions({ chart: { width: w } });
          } catch (e) { /* ApexCharts resize can throw if chart disposed */ }
        }, 100);
      }
    }
    if (targetPanel && tabName === "valuation-lab") {
      if (valuationFootballChart) {
        setTimeout(function () {
          try {
            var el = document.getElementById("valuation-football-chart");
            if (el && el.clientWidth > 0) valuationFootballChart.updateOptions({ chart: { width: el.clientWidth } });
          } catch (e) { /* ignore */ }
        }, 100);
      }
      if (dcfFcfChart) {
        try { dcfFcfChart.updateOptions({}); } catch (e) { /* ignore */ }
      }
    }
  }

  function showFacctingModalIfNeeded() {
    if (typeof window.showFacctingRequiredModal === "function") {
      window.showFacctingRequiredModal();
    } else {
      var modal = document.getElementById("faccting-required-modal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
      }
    }
  }

  function recordDeepAnalysisUsage(action) {
    if (!action) return;
    fetch("/api/terminal/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: action })
    }).catch(function () {});
  }

  function runAnalysis() {
    var input = document.getElementById("deep-analysis-ticker");
    var ticker = (input && input.value) ? input.value.trim().toUpperCase() : "";
    if (!ticker) return;
    var loader = document.getElementById("deep-analysis-loader");
    var content = document.getElementById("deep-analysis-content");
    var placeholder = document.getElementById("deep-analysis-placeholder");
    if (loader) loader.classList.remove("hidden");
    if (content) content.classList.add("hidden");
    if (placeholder) placeholder.classList.add("hidden");

    fetch("/api/watchlist", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (watchlistData) {
        if (watchlistData && watchlistData.has_faccting_token === true) {
          doDeepAnalysisFetch(ticker, loader, content, placeholder);
        } else {
          if (loader) loader.classList.add("hidden");
          showFacctingModalIfNeeded();
        }
      })
      .catch(function () {
        if (loader) loader.classList.add("hidden");
        showFacctingModalIfNeeded();
      });
  }

  var DEEP_TAB_TO_ACTION = {
    forensic: "deep_forensic",
    "smart-money": "deep_smart_money",
    "wall-st-consensus": "deep_wall_st_consensus",
    "valuation-lab": "deep_valuation_lab",
    "quality-profit": "deep_quality_profit",
    "capital-allocation": "deep_capital_allocation"
  };

  function doDeepAnalysisFetch(ticker, loader, content, placeholder) {
    fetch("/api/tools/deep-analysis/" + encodeURIComponent(ticker), { credentials: "same-origin" })
      .then(function (r) {
        return r.json().then(function (data) { return { res: r, data: data }; });
      })
      .then(function (out) {
        var r = out.res;
        var data = out.data;
        if (loader) loader.classList.add("hidden");
        if (r.status === 403 && (data.error === "FACCTing required" || (data.message && data.message.indexOf("FACCTing") !== -1))) {
          showFacctingModalIfNeeded();
          return;
        }
        if (data.error && !data.scores && !data.insider) {
          if (placeholder) { placeholder.textContent = "Error: " + (data.error || "No data"); placeholder.classList.remove("hidden"); }
          return;
        }
        if (placeholder) placeholder.classList.add("hidden");
        if (content) content.classList.remove("hidden");

        var scores = data.scores || {};
        renderAltmanGauge(scores.altmanZScore);
        renderPiotroskiGauge(scores.piotroskiScore);

        // Optional historical trends for sparklines (arrays of last N scores)
        renderAltmanSparkline(scores.altman_trend || scores.altmanHistory || []);
        renderPiotroskiSparkline(scores.piotroski_trend || scores.piotroskiHistory || []);

        var forensic = data.forensic || {};
        renderBeneishGauge(forensic.beneish);
        renderSloanCard(forensic.sloan);

        // Optional Beneish M-score history sparkline
        var beneishPayload = forensic.beneish && typeof forensic.beneish === "object" ? forensic.beneish : {};
        renderBeneishSparkline(beneishPayload.m_score_trend || beneishPayload.history || []);

        // Beneish components radar + red flag list
        renderBeneishRadar(forensic.beneish);
        renderForensicRedFlags(forensic);
        renderInsiderTable(data.insider || []);
        renderRevenueChart(
          data.revenue_chart_years || [],
          data.revenue_chart_historical || [],
          data.revenue_chart_estimated || []
        );
        renderPriceTargetCard(data.price_target || {});
        renderAnalystRatings(data.analyst_ratings || {});
        renderConsensusChart(
          data.consensus_years || [],
          data.consensus_revenue_historical || [],
          data.consensus_revenue_estimated || [],
          data.consensus_eps_historical || [],
          data.consensus_eps_estimated || []
        );

        renderDCFCalculator(data);
        renderQualityProfit(data);
        renderCapitalAllocation(data);

        switchTab("forensic");
      })
      .catch(function (err) {
        if (loader) loader.classList.add("hidden");
        if (placeholder) { placeholder.textContent = "Failed to load: " + (err && err.message ? err.message : "Network error"); placeholder.classList.remove("hidden"); }
      });
  }

  function init() {
    var btn = document.getElementById("deep-analysis-run-btn");
    var input = document.getElementById("deep-analysis-ticker");
    if (btn) btn.addEventListener("click", runAnalysis);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") runAnalysis(); });

    document.querySelectorAll(".deep-analysis-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var name = tab.getAttribute("data-deep-tab");
        if (name) switchTab(name);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
