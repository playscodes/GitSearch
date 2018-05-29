$( document ).ready(function() {
    // console.log('asas');
    var bookmarks = [];
    $("#bookmarks").children('li').each(function() {
        bookmarks.push($(this).attr('url'));
        });
    // console.log(bookmarks);
    $("#results").children('img').each(function() {
        if(bookmarks.includes($(this).attr('url'))){
            $(this).attr('src','/images/bookmark_true.png');
            $(this).attr('class','dell');
        }
    });

});

function updateTextInput(val) {

    $('#go_page').attr('value', `Show page ${val}`);

}


function bookmark(elem) {
    var ins = true;
    if (elem.attr('src').includes('false')){
        elem.attr('src','/images/bookmark_true.png');
        elem.attr('class','dell');
        $('#bookmarks').append(`<li url='${elem.attr('url')}'>
                                <a href='${elem.attr('url')}'>${elem.attr('url')}</a>
                                <p>${elem.attr('description')}</p>
                                <p>LANG: ${elem.attr('lang')} AUTHOR: ${elem.attr('author')} SCORE: ${elem.attr('score')} SEARCH: ${elem.attr('q')}</p>
                                </li>
                                <img class='dell' url='${elem.attr('url')}' src="/images/bookmark_true.png"  onclick = "bookmark($(this));">`);
    }else{
        $("#results").children('img').each(function() {
            if ($(this).attr('url')===elem.attr('url')){
                $(this).attr('src','/images/bookmark_false.png');
                $(this).attr('class','addd');
            }});


        ins = false;
        $("#bookmarks").children('li').each(function() {
            if ($(this).attr('url')===elem.attr('url')){
                $(this).remove();
            }});
        $("#bookmarks").children('img').each(function() {
            if ($(this).attr('url')===elem.attr('url')){
                $(this).remove();
            }});

        }


    // var ins =
    // if $(this).url ==''
    $.ajax({
        url: "/bookmarks",
        data: {
            "ins": ins,
            "q":elem.attr('q'),
            "url":elem.attr('url'),
            "description":elem.attr('description'),
            "lang":elem.attr('lang'),
            "author":elem.attr('author'),
            "score":elem.attr('score')

        },
        success: function (result) {
            // $(this).find("img").attr("src",'/images/bookmark_true.png');
        }
    });


}