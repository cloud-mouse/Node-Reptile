// 小说爬虫
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
const superagent = require('superagent')
require('superagent-charset')(superagent)
var { savejson, loadjson } = require('../utils')

router.get('/getBookList', async (req, res, next) => {
  // 小说列表url
  let url = 'https://www.zwdu.com/quanben/4.html'
  await superagent.get(url)
    .charset('gbk')
    .end(async (err, response) => {
      let $ = cheerio.load(response.text)
      var boookArr = [];
      var $bookList = $('#main .novelslist2 ul li:nth-of-type(n+2)');
      $bookList.each((i, el) => {
        var $book = $(el).find('.s2 a'); // 每个章节的dom
        let name = $book.text().trim() // 小说名
        let uri = 'https://www.zwdu.com' + $book.attr('href').trim() // 小说uri
        let type = $(el).find('.s1 a').text().trim() // 小说分类
        let author = $(el).find('.s4').text().trim()  // 小说作者
        boookArr.push({ name: name, author: author, type: type, uri: uri });
      });
      for (var i = 0; i < boookArr.length; i++) {
        console.log('开始获取' + boookArr[i].name + '的章节目录');
        getChapter(boookArr[i])
        console.log('-----------------分割线-----------------------')
      }
    })
  console.log('***************本页小说获取完成****************');
});

// 获取章节列表url 并执行获取章节目录页面
let getChapter = async (book) => {
  let curbook = JSON.parse(JSON.stringify(book))
  let uri = curbook.uri
  try {
    let $ = await rp({
      uri,
      encoding: null,
      transform: body => cheerio.load(iconv.decode(body, 'gb2312'))
    });
    let chapterArr = [];
    curbook.cover = $('#fmimg img').attr('src')
    curbook.description = $('#intro p:first').text()
    let $bookList = $('.box_con #list dl dd');
    $bookList.each((i, el) => {
      let index = i + 1;
      let $book = $(el).find('a'); // 每个章节的dom
      // 小说章节名
      let name = $book.text().trim()
      // 小说章节uri
      let uri = 'https://www.zwdu.com' + $book.attr('href').trim()
      chapterArr.push({ chapter_index: index, chapter_name: name, uri: uri });
    });
    console.log(curbook.name + '章节目录获取成功');
    console.log('开始获取' + curbook.name + '章节详情');
    for (let k = 0; k < chapterArr.length; k++) {
      chapterArr[k] = await getChapterContent(chapterArr[k])
      console.log(curbook.name + '    ' + chapterArr[k].chapter_name + '----章节内容获取完成');
    }
    curbook.chapter = chapterArr
    // 保存小说
    console.log('保存' + curbook.name + '到文件中');
    await savejson(__dirname + `\\bookList\\${curbook.name}.json`, curbook);
    console.log('保存' + curbook.name + '到文件中，成功')
    // return book
  } catch (error) {
    console.log(error);
  }


  // console.log('保存'+ book.name +'到文件中成功');
  // return book;

  // console.log('开始获取'+ book.name +'章节详情');
  // for(var k = 0; k< chapterArr.length; k++) {
  //   chapterArr[k].content = await getChapterContent(chapterArr[k])
  //   console.log(chapterArr[k].chapter_name + '----章节内容获取完成');
  // }
  // book.chapter = chapterArr

  // await savejson(__dirname + `\\book\\${book.name}.json`, book)
}

// 爬取章节目录页面的章节列表和url
var getChapterContent = async (chapter) => {
  let uri = chapter.uri
  try {
    // 获取章节的html页面
    let __$ = await rp({
      uri,
      encoding: null,
      transform: body => cheerio.load(iconv.decode(body, 'gb2312'))
    });
    // let $content = __$('#content'); // 所有章节的dom节点
    const content = reconvert(__$("#content").html())
    chapter.content = content;
    return chapter
  } catch (e) {
    return console.log('有问题啊：', e.message);
  }
}

//将Unicode转汉字
function reconvert(str) {
  str = str.replace(/(&#x)(\w{1,4});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, "$2"), 16));
  });
  return str
}


module.exports = router;
