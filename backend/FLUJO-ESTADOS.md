# Estados y correos automáticos

Pedidos avanzan un paso por actualización: pendiente de aprobación → confirmado → proceso → enviado → finalizado. Reservas: pendiente → confirmada → finalizada; se pueden cancelar mientras estén pendientes o confirmadas. Finalizada y cancelada son terminales. Repetir el estado actual no genera un correo nuevo.

La API comprueba la transición leyendo el estado real en una transacción de Firestore. En esa misma transacción actualiza el estado y crea el correo en la subcolección `correos` del registro. Solicitudes simultáneas al mismo estado no crean correos duplicados.

Después de guardar, SMTP intenta enviar el correo al contacto real del pedido o reserva. El historial muestra si está pendiente, enviando, enviado o fallido. Enviado significa aceptado por SMTP. Si falla, el cambio de estado se conserva y el historial ofrece reintentar. Una petición de cambio que repite el estado no reenvía el mensaje. Los mensajes pendientes por interrupción del servidor también se pueden reintentar. Un envío interrumpido en estado `enviando` necesita revisión antes de reenviar, para evitar duplicados.

La plantilla se guarda por tipo (`pedido` o `reserva`) en `plantillasEstado`. Conserva `{estado}` en asunto y título. Su edición afecta a futuros mensajes; el historial conserva una copia del contenido que se usó en cada cambio. La edición y el reintento requieren autenticación del administrador.

Rutas:

- GET/PUT `/api/admin/state-template/pedido` o `/api/admin/state-template/reserva`.
- POST `/api/admin/state-template/{tipo}/{registroId}/{correoId}` para reintentar un correo automático pendiente o fallido.

No se modifican estados de pedidos reales ni se envían correos reales en las pruebas automatizadas. Ejecutar `node --test` desde `backend`.
