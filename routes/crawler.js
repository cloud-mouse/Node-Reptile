// 小说爬虫
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var cheerio = require('cheerio');
var {savejson, loadjson} = require('../utils')

router.get('/getBookList', async(req, res, next)=> {
  let url = 'http://book.zongheng.com/store/c1/c0/b0/u0/p1/v0/s1/t0/u0/i1/ALL.html'
  
  var boookArr = [];
  let $ = await rp({
    url,
    transform: body => res.end(body)
  });
  
  var $bookList = $('.store_collist .bookbox');
  $bookList.each((i, el) => {
    let cover = $(el).find("img").attr('src'); // 小说封面
    var $book = $(el).find('.bookname a'); // 每个章节的dom
    let author = $(el).find('.bookinfo .bookilnk > a:first').text().trim() // 小说作者
    let name = $book.text().trim(); // 小说书名
    let description =  $(el).find('.bookintro').text().trim() // 小说描述
    var uri = $book.attr('href').trim(); // 小说详情链接
    boookArr.push({name: name, author: author, cover:cover, description: description, uri: uri });
  });
  // console.log(boookArr);
  // await savejson(__dirname + `\\book\\book.json`, boookArr)
  console.log('本页所有小说目录获取完成，开始获取小说章节条目')
  for(let i = 0,len = boookArr.length;i < len;i ++) {
    var book = boookArr[i];
    console.log('开始获取' + book.name + '章节条目');
    await getChapter(book);  
  }
  console.log('所有书本爬取完成');
  res.send({
    code: 200,
    data: boookArr,
    msg: '爬取完成'
  })
});

// 获取章节列表url 并执行获取章节目录页面
let getChapter = async(book)=>{
  let url = book.uri
  console.log(book.name, book.uri);
  try {
    let _$ = await rp({
      url,
      transform: body => cheerio.load(body)
    });
    // 章节页面的utl
    var $chapterUrl = await _$('.btn-group .link-group a:first').attr('href').trim(); // 所有章节的dom节点
    book.chapterUrl = $chapterUrl
    
    await getChapterPage(book, $chapterUrl)
  } catch (e){
      return console.log('这里没传：',e.message);
  }
}

// 爬取章节目录页面的章节列表和url
var getChapterPage = async(book, url)=>{
  try {
    // 获取章节的html页面
    let __$ = await rp({
      url,
      transform: body => cheerio.load(body)
    });
    var $chapters = __$('.volume-list .chapter-list li a'); // 所有章节的dom节点
    console.log(book.name, url);
    var chapterArr = []; // 存储章节信息
    console.log(book.name + ' [章节条目如下...]');
    $chapters.each((i, el) => {
        var index = i + 1;
        var $chapter = __$(el); // 每个章节的dom
        let name = $chapter.text().trim();
        var uri = $chapter.attr('href');
        console.log(name + ' ' + uri);
        chapterArr.push({ chapter_index: index, chapter_name: name, uri });
    });
    console.log(book.name + ' [章节条目抓取完毕，开始章节内容抓取...]');
    // 循环抓取章节内容
    for (var j = 0,len = chapterArr.length;j < len;j ++){
      var chapter = chapterArr[j];
      chapterArr[j].content = await crawlChapter(chapter);
    }
    console.log(book.name + ' [所有章节内容抓取完毕，继续 下一本书]');
    book.chapter = chapterArr;
    await savejson(__dirname + `\\book\\${book.name}.json`, book)
  } catch (e){
    return console.log('有问题啊：',e.message);
  }
}

// 爬取小说内容
var crawlChapter = async (chapter)=>{
  let { chapter_name, uri} = chapter
  try {
      let _$_ = await rp({
          uri,
          transform: body => cheerio.load(body)
      });
      var $content = _$_('.content'); // 只取正文内容
    //   $('.article-content span').remove(); // 干掉翻页提示
      var content = '   ' + $content.text().trim(); // 提取纯文本(不需要html标签，但保留换行和空格)
      console.log(chapter_name + ' [章节内容抓取完成...]');
      return content
  } catch (e){
      console.log('章节内容  ',e.message);
  }
}

module.exports = router;
