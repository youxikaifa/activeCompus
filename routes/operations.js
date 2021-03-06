var mongoose = require("mongoose");
var express = require('express');
var router = express.Router();
var label = require('../schema/label.js')
var lost = require('../schema/lost.js')
var user = require('../schema/user.js')
var autodyne = require('../schema/autodyne.js')
var feeling = require('../schema/feeling.js')

var string2Array = require('../module/func.js')

var monk = require('monk')
var db = monk('localhost:27017/activecompus')
var userDb = monk('localhost:27017/users')

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');

var hat = require('hat')
var rack = hat.rack()

// 单线程不需要自己关闭数据库连接
// 新建一个数据模型
// 参数1：数据表
// 参数2：数据格式
var Label = mongoose.model("Label", label);
var Lost = mongoose.model("Lost", lost);
var Feeling = mongoose.model("Feeling", feeling);
var AutoDyne = mongoose.model("AutoDyne", autodyne);

router.connect = function (req, res) {
  res.send("connect yes!");
}

router.insert = function (req, res) {
  // response.header("Content-Type", "application/json; charset=utf-8");
  var _label = new Label({
    name: req.body.name,
    title: req.body.title,
    content: req.body.content,
    publishTime: new Date().getTime().toString(),
    scanNum: 0,
    likeNum: 0,
    icUserUri: req.body.icUserUri,
    sex: req.body.sex,
    userId: [],
    uris: [],
  });

  _label.save(function (err) {
    console.log('fail' + err);
    res.send("动态发表成功")
  });
}

router.find = function (req, res) {
  Label.find({}, function (err, labels) {
    if (err) {
      console.log(err)
    } else {
      res.send(labels);
    }
  }).sort({ "pubTime": -1 }).limit(10);
}

router.update = function (req, res) {
  var time = req.body.publishTime;
  var like = req.body.likeNum;
  Label.update({
    publishTime: time
  }, { $set: { "likeNum": like } }, function (err, numberAffected, raw) {
    if (err) {
      res.send('update error' + err.getMessage);

    } else {
      res.send('update succ');
      console.log('update' + time + like);
    }
  });
}

router.remove = function (req, res) {
  Label.remove({
    name: "李咏"
  }, function (e) {
    if (e) res.send(e.message);
    res.send("删除成功");
  });
}

router.loadmore = function (req, res) {
  var param = req.query.publishTime;
  Label.find({ pubTime: { $lt: param } }, function (err, labels) {
    if (err) {
      console.log(err)
    } else {
      res.send(labels);
    }
  }).sort({ "pubTime": -1 }).limit(10);
}

router.getall = function (req, res) {
  Label.find({}, function (err, labels) {
    if (err) {
      res.send(err.message);
    } else {
      var count = labels.length;
      res.send(count.toString());
    }
  })
}

router.collect = function (req, res) {
  var collection = userDb.get("user")
  var user_id = req.query.user_id;
  var label_id = req.query.label_id;
  Label.update({
    _id: label_id
  }, { $push: { "followers": user_id } }, function (err, raw) { //without returning them
    if (err) {
      res.send('follow error' + err.getMessage);
    } else {
      collection.update({ "_id": user_id }, { $push: { collections: label_id } }, function (err, result) {
        if (err) {
          console.log('....' + err)
        } else {
          res.send('update succ')
        }
      })
    }
  });
}

router.unCollect = function (req, res) {
  var usercollection = userDb.get("user")
  var user_id = req.query.user_id;
  var label_id = req.query.label_id;
  Label.update({
    _id: label_id
  }, { $pull: { "followers": user_id } }, function (err, raw) {
    if (err) {
      res.send('follow error' + err.getMessage);
    } else {
      usercollection.update({ "_id": user_id }, { $pull: { collections: label_id } }, function (err, result) {
        if (err) {
          console.log('....' + err)
        } else {
          res.send('update succ')
        }
      })
    }
  });
}

router.like = function (req, res) {
  var user_id = req.query.user_id;
  var label_id = req.query.label_id;
  Label.update({
    _id: label_id
  }, { $push: { "likes": user_id } }, function (err, raw) {
    if (err) {
      res.send('like error' + err.getMessage);
    } else {
      res.send('like succ');
    }
  });
}

router.unLike = function (req, res) {
  var user_id = req.query.user_id;
  var label_id = req.query.label_id;
  Label.update({
    _id: label_id
  }, { $pull: { "likes": user_id } }, function (err, raw) {
    if (err) {
      res.send('like error' + err.getMessage);
    } else {
      res.send('like succ');
    }
  });
}

router.sendComment = function (req, res) {
  // var db = monk('localhost:27017/activecompus')
  var collection = db.get("comments");
  var labelId = req.query.labelId;
  collection.insert({ "labelId": labelId }, function (err) {
    if (err) {
      console.log("創建失敗" + err)
    } else {
      console.log("創建成功")
    }
  })
  var comment = {
    "userId": req.body.userId,
    "head": req.body.head,
    "name": req.body.name,
    "content": req.body.content,
    "pubTime": new Date().getTime().toString()
  }

  collection.update({ "labelId": labelId }, { $push: { "comment": comment } }, function (err, numberAffected, raw) {
    if (err) {
      res.send('comment error' + err.getMessage);
    } else {
      res.send('comment succ');
    }
  })
}

router.getComment = function (req, res) {
  var coms; //發送回去的comments
  var labelId = req.query.labelId;
  // console.log(">>>"+labelId)
  // var db = monk('localhost:27017/activecompus')
  var collection = db.get("comments");
  collection.find({ "labelId": labelId }, function (err, comments) {
    if (err) {
      res.send(e.message);
    } else {
      res.send(comments[0]);
    }
  });
}

router.notice = function (req, res) {
  var collection = userDb.get("user")
  var my_id = req.query.my_id
  var other_id = req.query.other_id
  collection.update({ "_id": my_id }, { $push: { "following": other_id } }, function (err, raw) {
    if (err) {
      res.send(err)
    } else {
      collection.update({ "_id": other_id }, { $push: { "fans": my_id } }, function (err, raw) {
        if (err) {
          res.send(err)
        } else {
          collection.find({ "_id": my_id }, function (err, docs) {
            if (err) {
              console.log("更新别人情况时失败")
            } else {
              res.send(docs[0])
            }
          })
        }
      })
    }
  })
}
router.unNotice = function (req, res) {
  var collection = userDb.get("user")
  var my_id = req.query.my_id
  var other_id = req.query.other_id
  collection.update({ "_id": my_id }, { $pull: { "following": other_id } }, function (err, raw) {
    if (err) {
      res.send(err)
    } else {
      collection.update({ "_id": other_id }, { $pull: { "fans": my_id } }, function (err, raw) {
        if (err) {
          res.send(err)
        } else {
          collection.find({ "_id": my_id }, function (err, docs) {
            if (err) {
              console.log("更新别人情况时失败")
            } else {
              res.send(docs[0])
            }
          })
        }
      })
    }
  })

}

router.getMyPub = function (req, res) {
  var user_id = req.query.user_id;
  console.log('userId' + user_id)
  Label.find({ "userId": user_id }, function (err, docs) {
    if (err) {
      console.log(err)
      res.send(err.getMessage)
    } else {
      console.log(docs)
      res.send(docs)
    }
  })
}

router.search = function (req, res) {
  var key = req.query.key;
  console.log("key" + key)
  var back = [];
  Label.find({ content: new RegExp("^.*" + key + ".*$") }, function (err, docs) {
    if (err) {
      console.log(err.getMessage)
    } else {
      res.send(docs)
    }
  })
}

router.getlost = function (req, res) {
  var pageSize = req.query.pageSize;
  Lost.find({}, function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      res.send(docs);
    }
  }).skip(10 * pageSize).sort({ "time": -1 }).limit(10);
}

router.searchlost = function (req, res) {
  var lostColl = db.get("losts")
  var key = req.query.key;
  lostColl.find({ title: new RegExp("^.*" + key + ".*$") }, function (err, docs) {
    if (err) {
      console.log(err.getMessage)
    } else {
      res.send(docs)
    }
  })
}

router.sendlost = function (req, res) {
  var lostColl = db.get("losts")
  //生成multiparty对象，并配置上传目标路径
  var form = new multiparty.Form({ uploadDir: './public/images/lost/' });
  //上传完成后处理
  form.parse(req, function (err, fields, files) {
    var filesTmp = JSON.stringify(files, null, 2);

    if (err) {
      console.log('parse error: ' + err);
    } else if (files.images != null) {
      console.log('parse files: ' + filesTmp);
      var size = files.images.length;
      var uris = [], urls = []

      for (var i = 0; i < size; i++) {
        var inputFile = files.images[i];
        var path = inputFile.path;
        var urlPath = '/images/lostthumb/' + path.substring(19);
        uris.push(path);
        urls.push(urlPath);
      }

      imagemin(uris, 'public/images/lostthumb', {
        plugins: [
          imageminMozjpeg(),
          imageminPngquant({ quality: '30-40' })
        ]
      }).then(
        (files) => {
          //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
          console.log('>>>>>>>>>>>>>succ' + files);
        }

        ).catch((error) => {
          console.log('>>>>>>>>>>fail' + error);
        });
    }

    var heads = fields.head,
      titles = fields.title, names = fields.name,
      contacts = fields.contact, addrs = fields.addr,
      types = fields.type, remarks = fields.remark;


    var _lost = {
      thumbs: urls,
      head: heads[0],
      title: titles[0],
      name: names[0],
      contact: contacts[0],
      addr: addrs[0],
      time: new Date().getTime().toString(),
      type: parseInt(types[0]),
      remark: remarks[0],
      school: "江西财经大学"
    }

    lostColl.insert(_lost, function (err) {
      if (err) {
        console.log('发表失败')
      } else {
        console.log('发表成功')
      }
    })

    res.writeHead(200, { 'content-type': 'text/plain;charset=utf-8' });
    res.write('received upload:\n\n');
    res.end(util.inspect({ fields: fields, files: filesTmp }));
  });
}

router.pubAutoDyne = function (req, res) {
  var autoColl = db.get("autodynes")
  //生成multiparty对象，并配置上传目标路径
  var form = new multiparty.Form({ uploadDir: './public/images/upload/' });
  //上传完成后处理
  form.parse(req, function (err, fields, files) {
    var filesTmp = JSON.stringify(files, null, 2);

    if (err) {
      console.log('parse error: ' + err);
    } else if (files.images != null) {
      console.log('parse files: ' + filesTmp);
      var size = files.images.length;
      var uris = [], urls = []

      for (var i = 0; i < size; i++) {
        var inputFile = files.images[i];
        var path = inputFile.path;
        var urlPath = '/images/autothumb/' + path.substring(21);
        uris.push(path);
        urls.push(urlPath);
      }

      imagemin(uris, 'public/images/autothumb', {
        plugins: [
          imageminMozjpeg(),
          imageminPngquant({ quality: '30-40' })
        ]
      }).then(
        (files) => {
          //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
          console.log('>>>>>>>>>>>>>succ' + files);
        }

        ).catch((error) => {
          console.log('>>>>>>>>>>fail' + error);
        });
    }

    var heads = fields.head,
      titles = fields.title, names = fields.name, types = fields.type, userIds = fields.userId
      schools = fields.school,mottos = fields.motto


    var _auto = {
      pics: urls,
      head: heads[0],
      title: titles[0],
      name: names[0],
      time: new Date().getTime().toString(),
      type: parseInt(types[0]),
      userId: userIds[0],
      scans: 0,
      likes: new Array(),
      comments: 0,
      school: schools[0],
      motto:mottos[0]
    }

    autoColl.insert(_auto, function (err) {
      if (err) {
        console.log('发表失败')
      } else {
        console.log('发表成功')
      }
    })

    res.writeHead(200, { 'content-type': 'text/plain;charset=utf-8' });
    res.write('received upload:\n\n');
    res.end(util.inspect({ fields: fields, files: filesTmp }));
  });
}

router.pubFeeling = function (req, res) {
  var autoColl = db.get("feelings")
  //生成multiparty对象，并配置上传目标路径
  var form = new multiparty.Form({ uploadDir: './public/images/upload/' });
  //上传完成后处理
  form.parse(req, function (err, fields, files) {
    var filesTmp = JSON.stringify(files, null, 2);

    if (err) {
      console.log('parse error: ' + err);
    } else if (files.images != null) {
      console.log('parse files: ' + filesTmp);
      var size = files.images.length;
      var uris = [], urls = []

      for (var i = 0; i < size; i++) {
        var inputFile = files.images[i];
        var path = inputFile.path;
        var urlPath = '/images/autothumb/' + path.substring(21);
        uris.push(path);
        urls.push(urlPath);
      }

      imagemin(uris, 'public/images/autothumb', {
        plugins: [
          imageminMozjpeg(),
          imageminPngquant({ quality: '30-40' })
        ]
      }).then(
        (files) => {
          //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
          console.log('>>>>>>>>>>>>>succ' + files);
        }

        ).catch((error) => {
          console.log('>>>>>>>>>>fail' + error);
        });
    }

    var heads = fields.head,
      contents = fields.content, names = fields.name, types = fields.type, userIds = fields.userId,
      sexs = fields.sex,mottos = fields.motto, schools = fields.school


    var _feel = {
      pics: urls,
      head: heads[0],
      content: contents[0],
      name: names[0],
      time: new Date().getTime().toString(),
      type: parseInt(types[0]),
      userId: userIds[0],
      sex: parseInt(sexs[0]),
      likes: new Array(),
      comments: 0,
      motto: mottos[0],
      school:schools[0]
    }

    autoColl.insert(_feel, function (err) {
      if (err) {
        console.log('发表失败')
      } else {
        console.log('发表成功')
      }
    })

    res.writeHead(200, { 'content-type': 'text/plain;charset=utf-8' });
    res.write('received upload:\n\n');
    res.end(util.inspect({ fields: fields, files: filesTmp }));
  });
}

router.sendlabel = function (req, res) {
  var labelColl = db.get("labels")
  //生成multiparty对象，并配置上传目标路径
  var form = new multiparty.Form({ uploadDir: './public/images/upload/' });
  //上传完成后处理
  form.parse(req, function (err, fields, files) {
    var filesTmp = JSON.stringify(files, null, 2);

    if (err) {
      console.log('parse error: ' + err);
    } else if (files.images != null) {
      // console.log('parse files: ' + filesTmp);
      var size = files.images.length;
      var uris = [], urls = []

      for (var i = 0; i < size; i++) {
        var inputFile = files.images[i];
        var path = inputFile.path;
        var imgPath = 'public/images/upload/' + path.substring(21);
        var urlPath = '/images/thumbnail/' + path.substring(21);
        uris.push(imgPath);
        urls.push(urlPath);
      }

      imagemin(uris, 'public/images/thumbnail', {
        plugins: [
          imageminMozjpeg(),
          imageminPngquant({ quality: '30-40' })
        ]
      }).then(
        (files) => {
          //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
          console.log('>>>>>>>>>>>>>succ' + files);
        }

        ).catch((error) => {
          console.log('>>>>>>>>>>fail' + error);
        });
    }
    console.log("fields" + fields)

    var heads = fields.head, userIds = fields.userId, sexs = fields.sex,
      names = fields.name, titles = fields.title, contents = fields.content,
      types = fields.type, tags = fields.tags,schools = fields.school, mottos = fields.motto

    var tagstr = tags[0];
    var tag;
    if (tagstr.length == 2) {
      tag = [];
    } else {
      tag = string2Array(tagstr);
    }

    var _label = {
      userId: userIds[0],
      head: heads[0],
      sex: parseInt(sexs[0]),
      name: names[0],
      content: contents[0],
      pubTime: new Date().getTime().toString(),
      type: 0,
      tags: tag,
      followers: [],
      likes: [],
      picUrls: urls,
      school: schools[0],
      motto:mottos[0]
    }

    labelColl.insert(_label, function (err) {
      if (err) {
        console.log('发表失败')
      } else {
        console.log('发表成功')
      }
    })

    res.writeHead(200, { 'content-type': 'text/plain;charset=utf-8' });
    res.write('received upload:\n\n');
    res.end(util.inspect({ fields: fields, files: filesTmp }));
  });
}

router.getAutoDyne = function (req, res) {
  var page = req.query.page;
  var type = req.query.type;
  var autoDyneColl = db.get("autodynes");
  AutoDyne.find({ "type": parseInt(type) }, function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      res.send(docs)
    }
  }).sort({ "time": -1 }).skip(8 * page).limit(8);
}

router.getLabels = function (req, res) {
  var page = req.query.page;
  var type = req.query.type;
  var autoDyneColl = db.get("labels");
  Label.find({}, function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      res.send(docs)
    }
  }).sort({ "pubTime": -1 }).skip(8 * page).limit(8);
}

router.getFeels = function (req, res) {
  var page = req.query.page;
  var school = req.query.school;
  var feelsColl = db.get("feelings");
  if (school == 'all') {
    Feeling.find({} , function (err, docs) {
      if (err) {
        console.log(err)
      } else {
        res.send(docs)
      }
    }).sort({ "time": -1 }).skip(8 * page).limit(8);
  } else {
    Feeling.find({ "school": school }, function (err, docs) {
      if (err) {
        console.log(err)
      } else {
        res.send(docs)
      }
    }).sort({ "time": -1 }).skip(8 * page).limit(8);
  }

}

router.getAutoComments = function (req, res) {
  var comColl = db.get("autocomments")
  var auto_id = req.query.auto_id;
  comColl.find({ "autoid": auto_id }, function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      res.send(docs)
    }
  })
}

router.commitAutoComment = function (req, res) {
  var auto_id = req.body.autoid;
  var comColl = db.get("autocomments");
  var feelColl = db.get("feelings");
  var fromUser, targetUser, repid, autoid, type, content
  var comment = {
    "created": new Date().getTime().toString(),
    "from_user": req.body.from_user || {},
    "target_user": req.body.target_user || {},
    "repid": req.body.repid,
    "autoid": auto_id,
    "type": req.body.type,
    "content": req.body.content
  }

  comColl.insert(comment, function (err) {
    if (err) {
      console.log(err.getMessage())
    } else {

      comColl.find({ "autoid": auto_id }, function (err, docs) {
        if (err) {
          console.log(err)
        } else {
          
          feelColl.update({ "_id": auto_id }, { $inc: { comments: 1 } }, function (err, feels) {
            if (err) {
              console.log(err)
            } else {
              res.send(docs)
            }
          })
        }
      })
    }
  })
}

router.clickAutoLike = function (req, res) {
  var autoColl = db.get("autodynes");
  var auto_id = req.query.auto_id;
  var user_id = req.query.user_id;

  var likes = [];
  autoColl.find({ "_id": auto_id }, function (err, docs) {
    if (err) {
      console.log(err.getMessage())
    } else {
      likes = docs[0].likes;
      var position = likes.indexOf(user_id)
      if (position != -1) {
        autoColl.update({ "_id": auto_id }, { $pull: { "likes": user_id } }, function (err, raw) {
          if (err) {
            console.log(err)
          } else {
            autoColl.find({ "_id": auto_id }, function (err, docs) {
              if (err) {
                console.log(err)
              } else {
                res.send(docs[0])
              }
            })
          }
        })
      } else {
        autoColl.update({ "_id": auto_id }, { $push: { "likes": user_id }, $inc: { scans: 1 } }, function (err, raw) {
          if (err) {
            console.log(err)
          } else {
            autoColl.find({ "_id": auto_id }, function (err, docs) {
              if (err) {
                console.log(err)
              } else {
                res.send(docs[0])
              }
            })
          }
        })
      }
    }
  })

}


router.clickFeelLike = function (req, res) {
  var feelColl = db.get("feelings");
  var feel_id = req.query.feel_id;
  var thumb = req.query.thumb;

  var likes = [];
  feelColl.find({ "_id": feel_id }, function (err, docs) {
    if (err) {
      console.log(err.getMessage())
    } else {
      likes = docs[0].likes;
      var position = likes.indexOf(thumb)
      if (position != -1) {
        feelColl.update({ "_id": feel_id }, { $pull: { "likes": thumb } }, function (err, raw) {
          if (err) {
            console.log(err)
          } else {
            feelColl.find({ "_id": feel_id }, function (err, docs) {
              if (err) {
                console.log(err)
              } else {
                res.send(docs[0])
              }
            })
          }
        })
      } else {
        feelColl.update({ "_id": feel_id }, { $push: { "likes": thumb } }, function (err, raw) {
          if (err) {
            console.log(err)
          } else {
            feelColl.find({ "_id": feel_id }, function (err, docs) {
              if (err) {
                console.log(err)
              } else {
                res.send(docs[0])
              }
            })
          }
        })
      }
    }
  })
}

router.joinScans = function (req, res) {
  var autoColl = db.get("autodynes");
  var auto_id = req.query.auto_id;

  autoColl.update({ "_id": auto_id }, { $inc: { scans: 1 } }, function (err, raw) {
    if (err) {
      console.log(err.getMessage())
    } else {
      res.send("succ")
    }
  })
}




module.exports = router;
