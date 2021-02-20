var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var books = require('./book')
var rp = require('request-promise');
var {savejson} = require('../utils')

let crawlBook = async()=>{
  console.log('小说目录插入开始...');
  // 小说先存入书籍表
  var boookArr = [];
  for (var x in books){
      boookArr.push(books[x]);
  }
  // await spiderModel.addBookMany(boookArr);
  console.log('小说内容抓取开始...');
  // 循环抓取小说目录
  for (var key in books){
      var {name, uri} = books[key];
      console.log(name + ' [章节条目抓取开始...]');
      try {
          var $ = await rp({
              uri,
              encoding: null,
              transform: body => cheerio.load(body)
          });
          var $chapters = $('.container .excerpts .excerpt a'); // 所有章节的dom节点
          var chapterArr = []; // 存储章节信息
          console.log(name + ' [章节条目如下...]');
          $chapters.each((i, el) => {
              var index = i + 1;
              var $chapter = $(el); // 每个章节的dom
              let name = $chapter.text().trim();
              var uri = $chapter.attr('href');
              console.log(name + ' ' + uri);
              chapterArr.push({ chapter_index: index, chapter_name: name, uri });
          });
      } catch (e){
          return console.log(e.message, 1);
      }

      console.log(name + ' [章节条目抓取完毕，开始章节内容抓取...]');

      // 循环抓取章节内容
      for (var i = 0,len = chapterArr.length;i < len;i ++){
          var chapter = chapterArr[i];
          chapterArr[i].content = await crawlChapter(chapter);
      }
      console.log(name + ' [所有章节内容抓取完毕，返回结果...]');
      await savejson(__dirname + `\\bookchapter\\${name}.json`, chapterArr)
      return chapterArr
  }
}

var crawlChapter = async (chapter)=>{
  let {bookId, index, chapter_name, uri} = chapter
  try {
      console.log(chapter_name + ' [章节内容抓取开始...]');
      var $ = await rp({
          uri,
          transform: body => cheerio.load(body)
      });
      var $content = $('.content'); // 只取正文内容
    //   $('.article-content span').remove(); // 干掉翻页提示
      var content = '   ' + $content.text().trim(); // 提取纯文本(不需要html标签，但保留换行和空格)
      console.log(chapter_name + ' [章节内容抓取完成...]');
      return content
  } catch (e){
      console.log(e.message, 1);
  }
}

/* GET users listing. */
router.get('/aaaaa', async(req, res, next)=> {
  let id = req.query.id
  let data = await crawlBook(id)
  res.send({
    data: data
  });
});

module.exports = router;
