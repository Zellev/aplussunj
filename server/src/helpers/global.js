/* eslint-disable */
const createError = require('../errorHandlers/ApiErrors')
const Passport = require('passport');
const pdfMake = require('pdfMake/build/pdfmake');
const vfsFonts = require('pdfMake/build/vfs_fonts');
const path = require('path');
pdfMake.vfs = vfsFonts.pdfMake.vfs;

module.exports = {
    async paginator(model, pages, limits, options) {       
        const page = pages
        const limit = limits
        const startIndex = (page - 1) * limit
        const endIndex = page * limit

        const results = {}

        if (endIndex < await model.count()) {
            results.next = {
                page: page + 1,
                limit: limit
            }
        }    
        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            }
        }
        if(options){
            results.results = await model.findAll(options)
        } else {
            results.results = await model.findAll({
                offset:startIndex,
                limit:limit
            })
        }        
        return results
    },
  
    async auther(req, res ,next) {       
        return new Promise((resolve, reject) => {           
            Passport.authenticate('jwt',{ session: false }, (err, user) => {
                if (err) {
                  reject(new Error(err))
                } else if (!user) {
                  reject(createError.Unauthorized('Server error!'))
                }
                resolve(user)
            })(req, res, next);
        })
    },

    todaysdate() {
        let today = new Date();
        let date = today.getDate()+'-'+(today.getMonth()+1)+'-'+today.getFullYear();
        let time = today.getHours() + '.' + today.getMinutes();
        let dateTime = date+'_'+time;
        return dateTime
    },

    createKode(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
      return result;
    },

    pdfCreatestatus(col, row, res) {
        const img = 'data:image/png;base64,' + require('fs')
                    .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
                    .toString('base64')
        let rows;        
        var imge = {            
            image: img,
            height: 130,
            width: 520
        }
        var dataTable = {
            style: 'table',
            table: {
                headerRows: 1,
                body: [ col ]
            },
            layout: {
                hLineWidth: function(i, node) {
                  if (i === 0 || i === node.table.body.length) {
                    return 0;
                  } else if (i === node.table.headerRows) {
                    return 2;
                  } else {
                    return 1;
                  }
                },
                vLineWidth: function(i) {
                  return 0;
                },
                hLineColor: function(i) {
                  if (i === 1) {
                    return '#2361AE';
                  } else {
                    return '#84a9d6';
                  }
                },
                paddingLeft: function(i) {
                  if (i === 0) {
                    return 0;
                  } else {
                    return 8;
                  }
                },
                paddingRight: function(i, node) {
                  if (i === node.table.widths.length - 1) {
                    return 0;
                  } else {
                    return 8;
                  }
                }
              }
        };
        rows = dataTable.table.body;
        for(let i of row){
            rows.push(i)
        }
        var dd = {
            content: [],
            styles: {
                table: {
                    margin: [10, 5, 0, 0]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: '#2361AE'
                }
            }
        }
        dd.content.push(imge, ' ', ' ', dataTable)
        const pdfDoc = pdfMake.createPdf(dd);
        return pdfDoc.getBase64((val)=>{
            res.writeHead(200,
            {                
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment;filename="${module.exports.todaysdate()}-status.pdf"`
            });    
            const download = Buffer.from(val.toString('utf-8'), 'base64');            
            res.end(download);
        });
    }

}