// Chargement des données et traitement
load_content('/administration/retrieve_django_logs').then(rep => {
	if (typeof rep.content !== "undefined") {
		const params = {
			parentElt: document.querySelector('[class="page_body"]'),
			data: rep.content
		};
		let tabs = createTabs(params);
	} else {
		alert("La récupération des fichiers n'a pas aboutie");
	}
});