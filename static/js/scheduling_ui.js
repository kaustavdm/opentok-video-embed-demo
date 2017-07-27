/* global flatpickr */

window.addEventListener('load', function () {

  flatpickr('.start_date_input', {
    enableTime: true,
    defaultDate: new Date(Date.now() + 300000),
    minDate: new Date(Date.now() + 60000)
  });

});
