// Références aux éléments du DOM
const form = document.getElementById("indemnity-form");
const licenciementInput = document.getElementById("licenciement");
const transactionnelleInput = document.getElementById("transactionnelle");
const salaireAnnuelInput = document.getElementById("salaire-annuel");
const ctx = document.getElementById("indemnityChart").getContext("2d");
const detailsDiv = document.getElementById("calculation-details"); // Référence à la nouvelle section

// Couleurs
const colors = {
  bleuFonce: "#1f77b4",
  bleuClair: "#aec7e8",
  orangeVif: "#ff7f0e",
  orangeClair: "#ffbb78",
  vertFonce: "#2ca02c",
  vertClair: "#98df8a",
  violetFonce: "#9467bd",
  violetClair: "#c5b0d5",
  plafondOrange: "#ff7f0e",
  plafondVert: "#2ca02c",
  plafondViolet: "#9467bd",
  rougeTransactionnelle: "#d62728",
};

// Variable pour stocker l'instance du graphique
let indemnityChart = null;

// PASS 2025
const PASS = 47100;

// Fonction de formatage en Euros
function formatCurrency(value) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// *** FONCTION DE CALCUL MISE À JOUR (retourne plus de détails) ***
function calculateBreakdown(
  indLicenciement,
  indTransactionnelle,
  salaireAnnuel
) {
  const totalIndemnity = indLicenciement + indTransactionnelle;

  // --- Calcul Exonération Impôt sur le Revenu (IR) ---
  const plafondIR_optionA = 2 * salaireAnnuel;
  const plafondIR_optionB = 0.5 * totalIndemnity;
  const plafondIR_optionC = indLicenciement;
  const plafondIR_final = Math.max(
    plafondIR_optionA,
    plafondIR_optionB,
    plafondIR_optionC
  );
  const irExonere = Math.min(totalIndemnity, plafondIR_final);
  const irSoumis = Math.max(0, totalIndemnity - irExonere);

  // --- Calcul Exonération Cotisations Sociales (SS) ---
  const plafondSS_optionA = irExonere; // Réutilise l'exonération IR calculée
  const plafondSS_optionB = 2 * PASS;
  const plafondSS_final = Math.min(plafondSS_optionA, plafondSS_optionB);
  const ssExonere = Math.min(totalIndemnity, plafondSS_final);
  const ssSoumis = Math.max(0, totalIndemnity - ssExonere);

  // --- Calcul Exonération CSG/CRDS ---
  const plafondCSG_optionA = ssExonere; // Réutilise l'exonération SS calculée
  const plafondCSG_optionB = indLicenciement;
  const plafondCSG_final = Math.min(plafondCSG_optionA, plafondCSG_optionB);
  const csgExonere = Math.min(totalIndemnity, plafondCSG_final);
  const csgSoumis = Math.max(0, totalIndemnity - csgExonere);

  // Retourne toutes les valeurs utiles pour l'affichage et les détails
  return {
    inputs: {
      indLicenciement,
      indTransactionnelle,
      salaireAnnuel,
      totalIndemnity,
    },
    ir: {
      soumis: irSoumis,
      exonere: irExonere,
      plafondOptionA: plafondIR_optionA,
      plafondOptionB: plafondIR_optionB,
      plafondOptionC: plafondIR_optionC,
      plafondFinal: plafondIR_final,
    },
    ss: {
      soumis: ssSoumis,
      exonere: ssExonere,
      plafondOptionA: plafondSS_optionA, // = irExonere
      plafondOptionB: plafondSS_optionB, // = 2 * PASS
      plafondFinal: plafondSS_final,
    },
    csg: {
      soumis: csgSoumis,
      exonere: csgExonere,
      plafondOptionA: plafondCSG_optionA, // = ssExonere
      plafondOptionB: plafondCSG_optionB, // = indLicenciement
      plafondFinal: plafondCSG_final,
    },
    // Plafonds pour les lignes du graphique (valeur + label préformaté)
    plafondsGraph: {
      ir: [
        {
          value: plafondIR_optionA,
          label: `Plafond IR (2x Salaire N-1): ${formatCurrency(
            plafondIR_optionA
          )}`,
        },
        {
          value: plafondIR_optionB,
          label: `Plafond IR (50% Indemnité): ${formatCurrency(
            plafondIR_optionB
          )}`,
        },
        {
          value: plafondIR_optionC,
          label: `Plafond IR (Ind. Licenc.): ${formatCurrency(
            plafondIR_optionC
          )}`,
        },
      ],
      ss: [
        {
          value: plafondSS_optionB,
          label: `Plafond SS (Max 2 PASS): ${formatCurrency(
            plafondSS_optionB
          )}`,
        },
      ],
      csg: [
        {
          value: plafondCSG_optionB,
          label: `Plafond CSG (Ind. Licenc.): ${formatCurrency(
            plafondCSG_optionB
          )}`,
        },
      ],
    },
  };
}

// *** NOUVELLE FONCTION pour mettre à jour les détails ***
function updateCalculationDetails(data) {
  let html = `<h2>Détail des Calculs</h2>`;

  html += `<h3>Impôt sur le Revenu (IR)</h3>`;
  html += `<p>Indemnité Totale Brute : <span class="value">${formatCurrency(
    data.inputs.totalIndemnity
  )}</span></p>`;
  // Plafonds IR
  html += `<p>Calcul du plafond d'exonération IR (le plus élevé des 3 suivants) :</p>`;
  html += `<span class="calc-step">Option A (2 x Salaire N-1) : 2 * ${formatCurrency(
    data.inputs.salaireAnnuel
  )} = <strong>${formatCurrency(data.ir.plafondOptionA)}</strong></span>`;
  html += `<span class="calc-step">Option B (50% Indemnité Totale) : 0.5 * ${formatCurrency(
    data.inputs.totalIndemnity
  )} = <strong>${formatCurrency(data.ir.plafondOptionB)}</strong></span>`;
  html += `<span class="calc-step">Option C (Indemnité Licenciement) : <strong>${formatCurrency(
    data.ir.plafondOptionC
  )}</strong></span>`;
  html += `<p>Plafond IR Retenu : Max(A, B, C) = <span class="value">${formatCurrency(
    data.ir.plafondFinal
  )}</span></p>`;
  // Répartition IR
  html += `<p class="final-result">Part Exonérée IR : Min(Indemnité Totale, Plafond IR Retenu) = Min(${formatCurrency(
    data.inputs.totalIndemnity
  )}, ${formatCurrency(
    data.ir.plafondFinal
  )}) = <span class="value">${formatCurrency(data.ir.exonere)}</span></p>`;
  html += `<p class="final-result">Part Soumise IR : Indemnité Totale - Part Exonérée IR = ${formatCurrency(
    data.inputs.totalIndemnity
  )} - ${formatCurrency(
    data.ir.exonere
  )} = <span class="value">${formatCurrency(data.ir.soumis)}</span></p>`;

  html += `<h3>Cotisations Sociales (SS)</h3>`;
  // Plafonds SS
  html += `<p>Calcul du plafond d'exonération SS (le plus faible des 2 suivants) :</p>`;
  html += `<span class="calc-step">Option A (Montant Exonéré IR) : <strong>${formatCurrency(
    data.ss.plafondOptionA
  )}</strong></span>`;
  html += `<span class="calc-step">Option B (2 x PASS) : 2 * ${formatCurrency(
    PASS
  )} = <strong>${formatCurrency(data.ss.plafondOptionB)}</strong></span>`;
  html += `<p>Plafond SS Retenu : Min(A, B) = <span class="value">${formatCurrency(
    data.ss.plafondFinal
  )}</span></p>`;
  // Répartition SS
  html += `<p class="final-result">Part Exonérée SS : Min(Indemnité Totale, Plafond SS Retenu) = Min(${formatCurrency(
    data.inputs.totalIndemnity
  )}, ${formatCurrency(
    data.ss.plafondFinal
  )}) = <span class="value">${formatCurrency(data.ss.exonere)}</span></p>`;
  html += `<p class="final-result">Part Soumise SS : Indemnité Totale - Part Exonérée SS = ${formatCurrency(
    data.inputs.totalIndemnity
  )} - ${formatCurrency(
    data.ss.exonere
  )} = <span class="value">${formatCurrency(data.ss.soumis)}</span></p>`;

  html += `<h3>CSG / CRDS</h3>`;
  // Plafonds CSG
  html += `<p>Calcul du plafond d'exonération CSG/CRDS (le plus faible des 2 suivants) :</p>`;
  html += `<span class="calc-step">Option A (Montant Exonéré SS) : <strong>${formatCurrency(
    data.csg.plafondOptionA
  )}</strong></span>`;
  html += `<span class="calc-step">Option B (Indemnité Licenciement) : <strong>${formatCurrency(
    data.csg.plafondOptionB
  )}</strong></span>`;
  html += `<p>Plafond CSG/CRDS Retenu : Min(A, B) = <span class="value">${formatCurrency(
    data.csg.plafondFinal
  )}</span></p>`;
  // Répartition CSG (Simplifiée pour l'indemnité totale)
  html += `<p class="final-result">Part Exonérée CSG/CRDS : Min(Indemnité Totale, Plafond CSG/CRDS Retenu) = Min(${formatCurrency(
    data.inputs.totalIndemnity
  )}, ${formatCurrency(
    data.csg.plafondFinal
  )}) = <span class="value">${formatCurrency(data.csg.exonere)}</span></p>`;
  html += `<p class="final-result">Part Soumise CSG/CRDS : Indemnité Totale - Part Exonérée CSG/CRDS = ${formatCurrency(
    data.inputs.totalIndemnity
  )} - ${formatCurrency(
    data.csg.exonere
  )} = <span class="value">${formatCurrency(data.csg.soumis)}</span></p>`;
  html += `<p><small>Note : Le calcul de la CSG/CRDS réellement due sur la partie soumise peut être plus complexe (abattements spécifiques non pris en compte ici).</small></p>`;

  detailsDiv.innerHTML = html;
}

// Fonction pour mettre à jour le graphique (légèrement modifiée pour utiliser data.plafondsGraph)
function updateChart() {
  const indLicenciement = parseFloat(licenciementInput.value) || 0;
  const indTransactionnelle = parseFloat(transactionnelleInput.value) || 0;
  const salaireAnnuel = parseFloat(salaireAnnuelInput.value) || 0;

  // Récupère toutes les données calculées
  const data = calculateBreakdown(
    indLicenciement,
    indTransactionnelle,
    salaireAnnuel
  );

  // Met à jour la section de détails HTML
  updateCalculationDetails(data);

  // Prépare les données pour Chart.js
  const chartData = {
    labels: ["Brut", "Impôt sur le revenu", "Cotisations sociales", "CSG/CRDS"],
    datasets: [
      {
        label: "Partie Inférieure (Licenc./Exonérée)",
        data: [
          data.inputs.indLicenciement,
          data.ir.exonere,
          data.ss.exonere,
          data.csg.exonere,
        ],
        backgroundColor: [
          colors.bleuFonce,
          colors.orangeClair,
          colors.vertClair,
          colors.violetClair,
        ],
        stack: "Stack 0",
        tooltipLabels: [
          "Indemnité Licenciement",
          "Partie Exonérée",
          "Partie Exonérée",
          "Partie Exonérée",
        ],
      },
      {
        label: "Partie Supérieure (Transac./Soumise)",
        data: [
          data.inputs.indTransactionnelle,
          data.ir.soumis,
          data.ss.soumis,
          data.csg.soumis,
        ],
        backgroundColor: [
          colors.rougeTransactionnelle,
          colors.orangeVif,
          colors.vertFonce,
          colors.violetFonce,
        ],
        stack: "Stack 0",
        tooltipLabels: [
          "Indemnité Transactionnelle",
          "Partie Soumise",
          "Partie Soumise",
          "Partie Soumise",
        ],
      },
    ],
  };

  // Configuration des annotations (utilisation de data.plafondsGraph)
  const annotations = {};
  let annotationIndex = 0;
  const annotationLabelDefaults = {
    enabled: true,
    content: (ctx) =>
      ctx.hovered ? `${ctx.element.options.label.mainContent}` : "",
    position: "end",
    backgroundColor: "rgba(40,40,40,0.85)",
    color: "#eee",
    font: { size: 10, weight: "bold" },
    padding: { top: 3, bottom: 3, left: 5, right: 5 },
    yAdjust: 0,
    xAdjust: 5,
    borderRadius: 3,
  };

  // Plafonds IR (Orange Pointillé)
  data.plafondsGraph.ir.forEach((p, index) => {
    annotations[`line_ir_${annotationIndex++}`] = {
      type: "line",
      scaleID: "y",
      value: p.value,
      borderColor: colors.plafondOrange,
      borderWidth: 1.5,
      borderDash: [6, 6],
      label: {
        ...annotationLabelDefaults,
        mainContent: p.label,
        yAdjust: index % 2 === 0 ? -8 : 8,
      },
      enter(ctx, event) {
        ctx.hovered = true;
        ctx.chart.update("none");
      },
      leave(ctx, event) {
        ctx.hovered = false;
        ctx.chart.update("none");
      },
    };
  });
  // Plafonds SS (Vert Pointillé)
  data.plafondsGraph.ss.forEach((p, index) => {
    annotations[`line_ss_${annotationIndex++}`] = {
      type: "line",
      scaleID: "y",
      value: p.value,
      borderColor: colors.plafondVert,
      borderWidth: 1.5,
      borderDash: [6, 6],
      label: { ...annotationLabelDefaults, mainContent: p.label, yAdjust: -8 },
      enter(ctx, event) {
        ctx.hovered = true;
        ctx.chart.update("none");
      },
      leave(ctx, event) {
        ctx.hovered = false;
        ctx.chart.update("none");
      },
    };
  });
  // Plafonds CSG (Violet Pointillé)
  data.plafondsGraph.csg.forEach((p, index) => {
    annotations[`line_csg_${annotationIndex++}`] = {
      type: "line",
      scaleID: "y",
      value: p.value,
      borderColor: colors.plafondViolet,
      borderWidth: 1.5,
      borderDash: [6, 6],
      label: {
        ...annotationLabelDefaults,
        mainContent: p.label,
        position: "start",
        xAdjust: -5,
        yAdjust: 8,
      },
      enter(ctx, event) {
        ctx.hovered = true;
        ctx.chart.update("none");
      },
      leave(ctx, event) {
        ctx.hovered = false;
        ctx.chart.update("none");
      },
    };
  });

  // Configuration générale du graphique (inchangée)
  const config = {
    type: "bar",
    data: chartData,
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: true,
      },
      plugins: {
        title: { display: false },
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              return tooltipItems[0].label;
            },
            label: function (context) {
              const datasetIndex = context.datasetIndex;
              const dataIndex = context.dataIndex;
              const value = context.raw;
              const label =
                context.dataset.tooltipLabels[dataIndex] ||
                context.dataset.label;
              // Utilise la fonction de formatage globale
              return `${label}: ${formatCurrency(value)}`;
            },
          },
        },
        annotation: {
          drawTime: "afterDatasetsDraw",
          annotations: annotations,
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: { color: "#ccc" },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: {
            color: "#ccc",
            // Utilise la fonction de formatage globale
            callback: function (value) {
              return formatCurrency(value);
            },
          },
          grace: "10%",
        },
      },
    },
  };

  if (indemnityChart) {
    indemnityChart.destroy();
  }
  indemnityChart = new Chart(ctx, config);
}

// Écouter les changements dans le formulaire
form.addEventListener("input", updateChart);

// Afficher le graphique initial et les détails au chargement
document.addEventListener("DOMContentLoaded", () => {
  updateChart();
});
