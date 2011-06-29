var ExtendedNewsComponent = (function($, undefined) {

    function ExtendedNewsComponent(element) {
        ExtendedNewsComponent.superclass.constructor.call(this, element, "ExtendedNewsComponent");
    }

    // ExtendedNewsComponent extends NewsComponent
    bc.core.extendClass(ExtendedNewsComponent, NewsComponent);

    // Override getListItemHTML in base class (NewsComponent). Here, we omit 
    // the timestamp and display up to 20 words of the article description
    NewsComponent.prototype.getListItemHTML = function (article) {
        var html =
            '<li class="article">\
                <a href="{{0}}">\
                    <h2 class="newsHeadlineColor{{1}}">{{2}}</h2>\
                    <div class="description">{{3}}</div>\
                </a>\
             </li>';

        var vars = [
            article.link,
            this.id,
            article.title,
            article.description.match(/([^ ]+ ){10,20}/)[0] + "..."
        ];

        return demo.markup(html, vars);
    }

    return ExtendedNewsComponent;

})(bc.lib.jQuery);
