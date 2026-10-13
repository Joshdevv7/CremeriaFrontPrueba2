import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMxn, lineQuantity, deliveryLabel } from '../src/utils/crmPresentation.js'
test('MXN conserva centavos y muestra dos decimales',()=>{assert.equal(formatMxn(1240),'$1,240.00');assert.equal(formatMxn(94.25),'$94.25')})
test('cantidades físicas permanecen separadas por unidad',()=>{assert.equal(lineQuantity({cantidadPedida:1.125},{unidad:'Peso'}),'1.125 kg');assert.equal(lineQuantity({cantidadPedida:8},{unidad:'Pieza'}),'8 pzas')})
test('caja reconstruye la captura sin cambiar la cantidad base',()=>{assert.equal(lineQuantity({cantidadPedida:24,esCaja:true,piezasPorCaja:24},{unidad:'Pieza'}),'24 pzas · 1 caja de 24')})
test('falta de unidad o factor no inventa una conversión',()=>{assert.equal(lineQuantity({cantidadPedida:3},null),'3 · Unidad sin confirmar');assert.equal(lineQuantity({cantidadPedida:3,esCaja:true},{unidad:'Pieza'}),'3 pzas')})
test('el estado del contrato conserva su etiqueta de entrega',()=>{assert.equal(deliveryLabel('CerradoParcial'),'Parcial');assert.equal(deliveryLabel('Cancelado'),'Cancelada')})
