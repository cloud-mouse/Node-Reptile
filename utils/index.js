var iconv = require('iconv-lite');
var fs = require('fs');
// 读取json文件 返回json数据
function loadjson(filepath) {
  console.log('filepath',filepath);
  var data;
  try {
    var jsondata = iconv.decode(fs.readFileSync(filepath, "binary"), "utf8");
    data = JSON.parse(jsondata);
  }
  catch (err) {
    console.log(err);
  }
  return data;
}

// 将json数据 保存为json文件 
const savejson = async(filepath, data)=> {
  var datastr = JSON.stringify(data, null, 4);
  if (datastr) {
    try {
      fs.writeFileSync(filepath, datastr);
    }
    catch (err) {
      console.log(err);
    }
  }
}

module.exports = {
  loadjson,
  savejson
}