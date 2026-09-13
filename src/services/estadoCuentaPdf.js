// Servicio de generación e impresión de Estado de Cuenta / Kardex en PDF (formato Carta profesional)

export function imprimirEstadoCuentaPdf(kd) {
  if (!kd) return

  const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fecha = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fechaHora = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const saldoReal = kd.saldo ?? kd.saldoActual ?? ((kd.totalCargado || 0) - (kd.totalAbonado || 0))
  const tel = kd.telefono || kd.clienteTelefono || 'Sin teléfono registrado'
  const compras = kd.compras || []
  const abonos = kd.abonos || []
  const hoyStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Armar filas de compras
  const comprasHtml = compras.map((c) => {
    const estadoClass = (c.estado || '').toLowerCase()
    const saldoComp = c.saldo ?? (c.monto - (c.abonado || 0))
    const lineasHtml = (c.lineas || []).map(l => `
      <tr class="linea-sub">
        <td style="padding-left: 24px;">• ${l.productoNombre || 'Producto'}</td>
        <td class="text-center">${l.cantidad} ${l.esCaja ? 'caja(s)' : 'pza(s)'}</td>
        <td class="text-right">${money(l.precioUnitario)}</td>
        <td class="text-right">${money(l.subtotal)}</td>
        <td colspan="2"></td>
      </tr>
    `).join('')

    return `
      <tr class="compra-row">
        <td><b>Pedido #${c.pedidoId}</b><br><small class="text-muted">${fecha(c.fecha)}</small></td>
        <td>${fecha(c.fechaLimite)}</td>
        <td class="text-right font-mono font-bold">${money(c.monto)}</td>
        <td class="text-right font-mono text-verde">${money(c.abonado)}</td>
        <td class="text-right font-mono ${saldoComp > 0 ? 'text-rojo' : 'text-muted'} font-bold">${money(saldoComp)}</td>
        <td class="text-center"><span class="badge ${estadoClass}">${c.estado}</span></td>
      </tr>
      ${lineasHtml}
    `
  }).join('')

  // Armar filas de abonos
  const abonosHtml = abonos.map((a) => `
    <tr>
      <td>${fechaHora(a.fecha)}</td>
      <td class="font-mono font-bold text-verde">${money(a.monto)}</td>
      <td>${a.nota || 'Abono general a cuenta'}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Estado de Cuenta - ${kd.clienteNombre}</title>
      <style>
        @page {
          size: letter;
          margin: 14mm 14mm 16mm 14mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1E2923;
          background: #fff;
          font-size: 12px;
          line-height: 1.4;
          padding: 10px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0E5C4A;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-icon {
          width: 38px;
          height: 38px;
          background: #0E5C4A;
          color: #fff;
          border-radius: 8px;
          font-weight: 800;
          font-size: 20px;
          display: grid;
          place-items: center;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0E5C4A;
        }
        .brand-sub {
          font-size: 11px;
          color: #586B63;
        }
        .doc-title {
          text-align: right;
        }
        .doc-title h1 {
          font-size: 16px;
          font-weight: 800;
          color: #152A24;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .doc-title p {
          font-size: 11px;
          color: #586B63;
          margin-top: 2px;
        }

        /* Tarjeta de cliente */
        .cli-card {
          background: #F4F7F5;
          border: 1px solid #DCE4E0;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .cli-card .col-l b {
          font-size: 14px;
          color: #152A24;
        }
        .cli-card .col-l div {
          font-size: 11.5px;
          color: #586B63;
          margin-top: 2px;
        }

        /* Resumen de saldo */
        .kpis {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr;
          gap: 12px;
          margin-bottom: 18px;
        }
        .kpi {
          border: 1px solid #DCE4E0;
          border-radius: 8px;
          padding: 10px 12px;
          background: #FAFCFB;
        }
        .kpi .l {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #586B63;
        }
        .kpi .v {
          font-size: 18px;
          font-weight: 800;
          margin-top: 4px;
        }
        .kpi.alert {
          background: #FEF3F2;
          border-color: #FECDCA;
        }
        .kpi.alert .l { color: #B42318; }
        .kpi.alert .v { color: #B42318; }
        .kpi.ok {
          background: #ECFDF3;
          border-color: #A6F4C5;
        }
        .kpi.ok .l { color: #027A48; }
        .kpi.ok .v { color: #027A48; }

        /* Tablas */
        .sec-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #0E5C4A;
          margin: 16px 0 8px 0;
          border-bottom: 1px solid #DCE4E0;
          padding-bottom: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        th {
          background: #E8EFEA;
          font-weight: 700;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #152A24;
          padding: 6px 8px;
          border: 1px solid #DCE4E0;
        }
        td {
          padding: 6px 8px;
          border: 1px solid #DCE4E0;
          font-size: 11px;
        }
        .compra-row {
          background: #fff;
          font-weight: 600;
        }
        .linea-sub {
          background: #FAFCFB;
          font-size: 10px;
          color: #586B63;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-muted { color: #64748b; }
        .text-verde { color: #0E5C4A; }
        .text-rojo { color: #B42318; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-bold { font-weight: 700; }

        .badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge.pagada { background: #ECFDF3; color: #027A48; }
        .badge.vencida { background: #FEF3F2; color: #B42318; }
        .badge.pendiente { background: #FFF9E6; color: #B9781F; }

        /* Pie */
        .footer {
          margin-top: 24px;
          border-top: 1px dashed #B8C7C0;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #7C8A82;
        }
        .signature {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }
        .sig-box {
          border-top: 1px solid #1E2923;
          width: 200px;
          text-align: center;
          padding-top: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand-logo">
          <div class="brand-icon">D</div>
          <div>
            <div class="brand-name">DISTRIBUIDORA</div>
            <div class="brand-sub">Comercialización y Distribución de Alimentos</div>
          </div>
        </div>
        <div class="doc-title">
          <h1>Estado de Cuenta</h1>
          <p>Emisión: ${hoyStr}</p>
        </div>
      </div>

      <div class="cli-card">
        <div class="col-l">
          <b>${kd.clienteNombre}</b>
          <div>Teléfono: ${tel}</div>
        </div>
        <div class="col-r" style="text-align:right;">
          <small class="text-muted">ID Cliente: #${kd.clienteId}</small><br>
          <span class="badge ${saldoReal > 0 ? 'vencida' : 'pagada'}">${saldoReal > 0 ? 'Saldo Pendiente' : 'Al Corriente'}</span>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="l">Total Compras a Crédito</div>
          <div class="v">${money(kd.totalCargado)}</div>
        </div>
        <div class="kpi ok">
          <div class="l">Total Abonado Histórico</div>
          <div class="v">${money(kd.totalAbonado)}</div>
        </div>
        <div class="kpi ${saldoReal > 0 ? 'alert' : 'ok'}">
          <div class="l">Saldo Deudor Actual</div>
          <div class="v">${money(saldoReal)}</div>
        </div>
      </div>

      <div class="sec-title">Compras a Crédito (${compras.length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Pedido / Fecha</th>
            <th style="width: 15%;">Vencimiento</th>
            <th class="text-right" style="width: 15%;">Monto</th>
            <th class="text-right" style="width: 15%;">Abonado</th>
            <th class="text-right" style="width: 15%;">Saldo Restante</th>
            <th class="text-center" style="width: 15%;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${comprasHtml || '<tr><td colspan="6" class="text-center text-muted">No hay compras a crédito registradas.</td></tr>'}
        </tbody>
      </table>

      <div class="sec-title">Historial de Abonos Recibidos (${abonos.length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 28%;">Fecha y Hora</th>
            <th style="width: 22%;">Monto Abonado</th>
            <th style="width: 50%;">Concepto / Nota</th>
          </tr>
        </thead>
        <tbody>
          ${abonosHtml || '<tr><td colspan="3" class="text-center text-muted">No hay abonos registrados para este cliente.</td></tr>'}
        </tbody>
      </table>

      <div class="signature">
        <div class="sig-box">Firma de Conformidad / Administración</div>
      </div>

      <div class="footer">
        <span>Documento oficial de control de cartera y cobranza · Distribuidora</span>
        <span>Agradecemos su preferencia y puntualidad</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `

  const win = window.open('', '_blank', 'width=850,height=900')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}
