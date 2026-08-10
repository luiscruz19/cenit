import PDFDocument from 'pdfkit';

/**
 * Render del reporte a PDF con pdfkit.
 *
 * Se eligió pdfkit y no Chromium headless (Puppeteer) a propósito: el reporte es
 * KPIs y tablas, y meter un navegador entero en la imagen sumaría cientos de MB al
 * contenedor de la API. La contra es que no hay gráficos ricos; las barras se dibujan
 * a mano, que para esto alcanza.
 */

const INK = '#171b21';
const MUTED = '#626d79';
const LINE = '#dfe4e9';
const ACCENT = '#0e6b75';
const OK = '#2c6e49';
const BAD = '#9e3a3a';
const WARN = '#8a5a12';

const M = 48;               // margen
const PAGE_W = 595.28;      // A4 en puntos
const CONTENT_W = PAGE_W - M * 2;

const fmtInt = (v) => Math.round(Number(v) || 0).toLocaleString('es-AR');
const fmtPct = (v) => `${((Number(v) || 0) * 100).toFixed(1).replace('.', ',')}%`;
const fmtPos = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(1).replace('.', ','));

const fmtValue = (value, type) => {
    switch (type) {
        case 'pct': return fmtPct(value);
        case 'position': return fmtPos(value);
        default: return fmtInt(value);
    }
};

const fmtDelta = (delta) => {
    if (delta === null || delta === undefined) return null;
    const p = delta * 100;
    return `${p > 0 ? '+' : ''}${p.toFixed(1).replace('.', ',')}%`;
};

const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = String(d).split('-');
    return `${day}/${m}/${y}`;
};

/** Si no entra en la página, salta a una nueva y devuelve la Y de arranque. */
const ensureSpace = (doc, needed) => {
    if (doc.y + needed > doc.page.height - M) {
        doc.addPage();
        return M;
    }
    return doc.y;
};

const sectionTitle = (doc, text) => {
    const y = ensureSpace(doc, 60);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(text, M, y);
    doc.moveTo(M, doc.y + 4).lineTo(M + CONTENT_W, doc.y + 4).strokeColor(LINE).lineWidth(1).stroke();
    doc.moveDown(0.8);
};

/** Grilla de KPIs: 3 por fila, con su variación. */
const drawKpis = (doc, kpis) => {
    if (!kpis?.length) return;
    const perRow = 3;
    const boxW = CONTENT_W / perRow;
    const boxH = 56;
    let y = ensureSpace(doc, boxH * Math.ceil(kpis.length / perRow) + 10);

    kpis.forEach((k, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = M + col * boxW;
        const yy = y + row * boxH;

        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
            .text(k.label.toUpperCase(), x, yy, { width: boxW - 8, characterSpacing: 0.5 });
        doc.font('Helvetica-Bold').fontSize(16).fillColor(INK)
            .text(fmtValue(k.value, k.type), x, yy + 12, { width: boxW - 8 });

        const delta = fmtDelta(k.delta);
        if (delta) {
            // En posición el delta ya viene invertido por el servicio de datos, así que
            // acá "positivo = mejoró" vale para todas las métricas por igual.
            const color = k.delta > 0 ? OK : k.delta < 0 ? BAD : MUTED;
            doc.font('Helvetica').fontSize(9).fillColor(color)
                .text(`${delta} vs. período anterior`, x, yy + 33, { width: boxW - 8 });
        }
    });

    doc.y = y + Math.ceil(kpis.length / perRow) * boxH + 6;
};

/**
 * Tabla genérica. `cols` = [{ key, label, width, align, format }].
 * Corta el texto que no entra y repite el encabezado si salta de página.
 */
const drawTable = (doc, cols, rows, { emptyText = 'Sin datos.' } = {}) => {
    if (!rows?.length) {
        doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(emptyText, M, doc.y);
        doc.moveDown(0.8);
        return;
    }

    const header = () => {
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
        let x = M;
        for (const c of cols) {
            doc.text(c.label.toUpperCase(), x, y, { width: c.width, align: c.align || 'left' });
            x += c.width;
        }
        doc.moveTo(M, y + 12).lineTo(M + CONTENT_W, y + 12).strokeColor(LINE).stroke();
        doc.y = y + 17;
    };

    header();

    for (const row of rows) {
        if (doc.y + 20 > doc.page.height - M) {
            doc.addPage();
            doc.y = M;
            header();
        }
        const y = doc.y;
        let x = M;
        for (const c of cols) {
            const raw = row[c.key];
            const text = c.format ? c.format(raw, row) : (raw === null || raw === undefined ? '—' : String(raw));
            doc.font('Helvetica').fontSize(9).fillColor(c.color ? c.color(raw, row) : INK)
                .text(text, x, y, { width: c.width - 6, align: c.align || 'left', lineBreak: false, ellipsis: true });
            x += c.width;
        }
        doc.y = y + 15;
        doc.moveTo(M, doc.y - 4).lineTo(M + CONTENT_W, doc.y - 4).strokeColor('#f0f2f4').stroke();
    }
    doc.moveDown(0.6);
};

/**
 * Genera el PDF y lo devuelve como Buffer (para adjuntarlo al email o descargarlo).
 */
export const renderReportPdf = (data) => new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Portada / encabezado ────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT)
        .text('CENIT', M, M, { characterSpacing: 1.2 });
    doc.font('Helvetica-Bold').fontSize(22).fillColor(INK)
        .text(data.title, M, doc.y + 6, { width: CONTENT_W });
    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
        .text(data.scope, M, doc.y + 2);
    if (data.range) {
        doc.font('Helvetica').fontSize(10).fillColor(MUTED)
            .text(`${fmtDate(data.range.from)} – ${fmtDate(data.range.to)} · comparado con el período anterior`, M, doc.y + 2);
    }
    doc.moveTo(M, doc.y + 10).lineTo(M + CONTENT_W, doc.y + 10)
        .strokeColor(INK).lineWidth(1.5).stroke();
    doc.y += 22;

    // ── KPIs ────────────────────────────────────────────────────────────
    if (data.kpis?.length) {
        drawKpis(doc, data.kpis);
    }

    // ── Salud ───────────────────────────────────────────────────────────
    if (data.health?.length) {
        sectionTitle(doc, 'Problemas detectados');
        for (const h of data.health) {
            const y = ensureSpace(doc, 40);
            const color = h.level === 'critical' ? BAD : WARN;
            doc.font('Helvetica-Bold').fontSize(10).fillColor(color)
                .text(`${h.name} · ${h.level === 'critical' ? 'crítico' : 'atención'}`, M, y);
            for (const reason of h.reasons) {
                doc.font('Helvetica').fontSize(9).fillColor(MUTED)
                    .text(`• ${reason}`, M + 10, doc.y + 1, { width: CONTENT_W - 10 });
            }
            doc.moveDown(0.5);
        }
    }

    // ── Oportunidades ───────────────────────────────────────────────────
    if (data.opportunities?.length) {
        sectionTitle(doc, 'Oportunidades SEO');
        if (data.estClicksGain) {
            doc.font('Helvetica').fontSize(10).fillColor(MUTED)
                .text(`Hasta ${fmtInt(data.estClicksGain)} clicks potenciales si se trabajan estas consultas.`, M, doc.y);
            doc.moveDown(0.6);
        }
        drawTable(doc, [
            { key: 'query', label: 'Consulta', width: 200 },
            { key: 'site', label: 'Sitio', width: 100 },
            { key: 'position', label: 'Pos.', width: 50, align: 'right', format: fmtPos },
            { key: 'impressions', label: 'Impresiones', width: 80, align: 'right', format: fmtInt },
            { key: 'estClicks', label: 'Clicks ganables', width: 69, align: 'right', format: (v) => `+${fmtInt(v)}`, color: () => OK },
        ], data.opportunities);
    }

    // ── Rankings ────────────────────────────────────────────────────────
    if (data.rankings?.length) {
        sectionTitle(doc, 'Rankings');
        const s = data.rankingSummary;
        if (s) {
            doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(
                `${fmtInt(s.total)} consultas · ${fmtInt(s.top3)} en top 3 · ${fmtInt(s.top10)} en top 10 · `
                + `${fmtInt(s.page2)} en página 2 · posición media ${fmtPos(s.avgPosition)}`,
                M, doc.y, { width: CONTENT_W }
            );
            doc.moveDown(0.6);
        }
        drawTable(doc, [
            { key: 'query', label: 'Consulta', width: 220 },
            { key: 'site', label: 'Sitio', width: 110 },
            { key: 'position', label: 'Posición', width: 60, align: 'right', format: fmtPos },
            {
                key: 'delta',
                label: 'Cambio',
                width: 60,
                align: 'right',
                format: (v) => (v === null ? 'nueva' : `${v > 0 ? '+' : ''}${fmtPos(v)}`),
                // Delta positivo = subió puestos = mejoró.
                color: (v) => (v === null ? MUTED : v > 0.5 ? OK : v < -0.5 ? BAD : MUTED),
            },
            { key: 'clicks', label: 'Clicks', width: 49, align: 'right', format: fmtInt },
        ], data.rankings);
    }

    // ── Top páginas / sitios ────────────────────────────────────────────
    if (data.topPages?.length) {
        const isPortfolio = data.siteId === null;
        sectionTitle(doc, isPortfolio ? 'Sitios por tráfico' : 'Páginas con más clicks');
        drawTable(doc, isPortfolio ? [
            { key: 'label', label: 'Sitio', width: 180 },
            { key: 'sessions', label: 'Sesiones', width: 90, align: 'right', format: fmtInt },
            { key: 'clicks', label: 'Clicks', width: 80, align: 'right', format: fmtInt },
            { key: 'impressions', label: 'Impresiones', width: 90, align: 'right', format: fmtInt },
            { key: 'position', label: 'Pos.', width: 59, align: 'right', format: fmtPos },
        ] : [
            { key: 'label', label: 'Página', width: 260 },
            { key: 'clicks', label: 'Clicks', width: 80, align: 'right', format: fmtInt },
            { key: 'impressions', label: 'Impresiones', width: 100, align: 'right', format: fmtInt },
            { key: 'position', label: 'Posición', width: 59, align: 'right', format: fmtPos },
        ], data.topPages);
    }

    // ── Conversiones ────────────────────────────────────────────────────
    if (data.conversions?.length) {
        sectionTitle(doc, 'Conversiones por tipo');
        drawTable(doc, [
            { key: 'event', label: 'Evento clave', width: 380 },
            { key: 'keyEvents', label: 'Conversiones', width: 119, align: 'right', format: fmtInt },
        ], data.conversions);
    }

    // ── Geografía ───────────────────────────────────────────────────────
    if (data.geography?.length) {
        sectionTitle(doc, 'De dónde entra la gente');
        drawTable(doc, [
            { key: 'country', label: 'País', width: 380 },
            { key: 'sessions', label: 'Sesiones', width: 119, align: 'right', format: fmtInt },
        ], data.geography);
    }

    // ── Pie de página en todas las hojas ────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
            `Cenit · generado automáticamente · página ${i + 1} de ${range.count}`,
            M,
            doc.page.height - M + 12,
            { width: CONTENT_W, align: 'center' }
        );
    }

    doc.end();
});
