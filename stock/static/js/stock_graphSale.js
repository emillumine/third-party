var myChart;


function get_ajax_data(product_id){
  
  $.ajax({
    type: 'GET',
    url: 'get_list_sale_breaking/' + product_id,
    dataType:"json",
    timeout: 3000,
    beforeSend: function () { },
    complete: function () {  },
    success: function(data) {
        myChart.data = data['data'];
        myChart.update();

      
    },
    error: function() {
      alert('Les données n\'ont pas pu être récupérées, réessayez plus tard.');
    }
  });
}
  

var config = {
      type: 'bar',
      data: {},
      options: {
        title: {
          display: true,
          text: 'Graph. des ventes'
        },
        legend: { display: false }
      }
  };



window.onload = function() {
  myChart =  new Chart(document.getElementById("mixed-chart"), config);
}

$(function(){
    $('.modal').on('show.bs.modal', function (e) {
      var button = $(e.relatedTarget)
      var index = button.data('remote')
      //$(this).find('.modal-content').load('remote' + index + '.html')
      get_ajax_data(index);
      
    })
  })
