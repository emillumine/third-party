var load_content = async function(url, call_back) {
   openModal();
   try {
      let res = await fetch(url);
      content = await res.json()
      closeModal();
      return content;

   } catch (main_error) {
      return {error: main_error}
   }
};

var tabsStructure = {
   tabs : [],
   parentElt : null,
   structure: null,
   init: async function(params) {
      let data = params.data || [];
      this.parentElt = params.parentElt || document.querySelector('body');
          
      data.forEach((item, idx) => {
         let tab = {
            label: item.key,
            content: item.value,
            idx: idx
         };
         this.tabs.push(tab);
      });
    
   },
   tab_format_content: function(content, idx=0) {
      let html_content = "";
      if (Array.isArray(content) == true) {
         content.forEach((elt) => {
            html_content += this.tab_format_content(elt) + "<br/>";
         });
      } else if (typeof content === "string") {
         html_content += content.replace("\n", "<br/>");
      } else {
         html_content += JSON.stringify(content) + "<br/>";
      }
      return html_content;
   },
   draw: async function() {
      if (this.tabs.length > 0) {
         //generate dom structure according https://codepen.io/dhs/pen/zYErrW (Pure CSS tabs without Javascript)
         this.structure = document.createElement("ul");
         this.structure.classList.add("tabs");

         this.tabs.forEach((tab) => {
            let li = document.createElement("li"),
                input = document.createElement("input"),
                label = document.createElement("label"),
                div = document.createElement("div");
            li.classList.add("tab", "elt" + tab.idx);
            input.setAttribute("type", "radio");
            input.setAttribute("name", "tabs");
            input.setAttribute("id", "tab-" + tab.idx);
            if (tab.idx == 0) input.setAttribute("checked", "checked")
            label.setAttribute("for", "tab-" + tab.idx);
            label.innerText = tab.label;
            div.classList.add("content");
            div.setAttribute("id", "tab-content-" + tab.idx);
            div.innerHTML = this.tab_format_content(tab.content);
            li.append(input);
            li.append(label);
            li.append(div);
            this.structure.append(li);
            this.parentElt.append(this.structure);
         });
      }
   }
};

var createTabs = async function(params) {
   let result = null,
       p = params || {};
   try {
      let tabs = Object.create(tabsStructure);
      await tabs.init(p);
      await tabs.draw();
      result = tabs;
   } catch (e) {
      alert("Les onglets n'ont pas pu être créés");
      console.log(e);
   }
   
   
   return result;
}

var showListInDatatable = function(parent_div, list_data, colums_def, row_click_handler) {
    // Init table for items to process
    const d = new Date();
    let table = $('<table>').attr('id', d.getTime())
    $(parent_div).append(table);
    let data_table = table.DataTable({
        data: list_data,
        columns: colums_def,
        paging: false,
        dom: 'lrtip', // Remove the search input from that table
        language: {url : '/static/js/datatables/french.json'}
    });
   $('#' + d.getTime() + ' tbody').on('click', 'td.as-row-clickable', function () {
      const clicked = $(this)
      var row = data_table.row(this);
      table.find('tr').removeClass('selected');
      clicked.closest('tr').addClass('selected')
      row_click_handler(row.data())
   });
   return data_table; 
}

$('#back_to_admin_index').on('click', function() {
	const to_remove = window.location.href.split('/').pop();
	const new_url = window.location.href.replace(to_remove, "");
	window.location.href = new_url;
});