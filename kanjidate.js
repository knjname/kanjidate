"use strict";

var trunc = Math.trunc || function(x){
	if( x >= 0 ){
		return Math.floor(x);
	} else {
		return Math.ceil(x);
	}
};

function ge(year1, month1, day1, year2, month2, day2){
	if( year1 > year2 ){
		return true;
	}
	if( year1 < year2 ){
		return false;
	}
	if( month1 > month2 ){
		return true;
	}
	if( month1 < month2 ){
		return false;
	}
	return day1 >= day2;
}

function gengouToAlpha(gengou){
	switch(gengou){
		case "平成": return "Heisei";
		case "昭和": return "Shouwa";
		case "大正": return "Taishou";
		case "明治": return "Meiji";
		default: throw new Error("unknown gengou: " + gengou);
	}
}

function padLeft(str, n, ch){
	var m = n - str.length;
	var pad = "";
	while( m-- > 0 ){
		pad += ch;
	}
	return pad + str;
}

var zenkakuDigits = ["０", "１", "２", "３", "４", "５", "６", "７", "８", "９"];
var alphaDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function isZenkakuDigit(ch){
	return zenkakuDigits.indexOf(ch) >= 0;
}

function isAlphaDigit(ch){
	return alphaDigits.indexOf(ch) >= 0;
}

function alphaDigitToZenkaku(ch){
	var i = alphaDigits.indexOf(ch);
	return i >= 0 ? zenkakuDigits[i] : ch;
}

function isDateObject(obj){
	return obj instanceof Date;
}

function toGengou(year, month, day){
	if( ge(year, month, day, 1989, 1, 8) ){
		return { gengou:"平成", nen:year - 1988 };
	}
	if( ge(year, month, day, 1926, 12, 25) ){
		return { gengou:"昭和", nen:year - 1925 };
	}
	if( ge(year, month, day, 1912, 7, 30) ){
		return { gengou:"大正", nen:year - 1911 };
	}
	if( ge(year, month, day, 1873, 1, 1) ){
		return { gengou: "明治", nen: year - 1867 };
	}
	return { gengou: "西暦", nen: year };
}

exports.toGengou = toGengou;

function fromGengou(gengou, nen){
    nen = Math.floor(+nen);
    if( nen < 0 ){
    	throw new Error("invalid nen: " + nen);
    }
    switch (gengou) {
        case "平成":
            return 1988 + nen;
        case "昭和":
            return 1925 + nen;
        case "大正":
            return 1911 + nen;
        case "明治":
            return 1867 + nen;
        case "西暦":
            return nen;
        default:
            throw new Error("invalid gengou: " + gengou);
    }
}

exports.fromGengou = fromGengou;

var youbi = ["日", "月", "火", "水", "木", "金", "土"];

function toYoubi(dayOfWeek){
	return youbi[dayOfWeek];
}

exports.toYoubi = toYoubi;

function KanjiDate(date){
	this.year = date.getFullYear();
	this.month = date.getMonth()+1;
	this.day = date.getDate();
	this.hour = date.getHours();
	this.minute = date.getMinutes();
	this.second = date.getSeconds();
	this.msec = date.getMilliseconds();
	this.dayOfWeek = date.getDay();
	var g = toGengou(this.year, this.month, this.day);
	this.gengou = g.gengou;
	this.nen = g.nen;
	this.youbi = youbi[this.dayOfWeek];
}

function KanjiDateExplicit(year, month, day, hour, minute, second, millisecond){
	var date = new Date(year, month-1, day, hour, minute, second, millisecond);
	return new KanjiDate(date);
}

function parseFormatString(fmtStr){
	var result = [];
	var parts = fmtStr.split(/(\{[^}]+)\}/);
	parts.forEach(function(part){
		if( part === "" ) return;
		if( part[0] === "{" ){
			part = part.substring(1);
			var token = {};
			var colon = part.indexOf(":");
			if( part.indexOf(":") >= 0 ){
				token.part = part.substring(0, colon);
				var optStr = part.substring(colon+1).trim();
				if( optStr !== "" ){
					if( optStr.indexOf(",") >= 0 ){
						token.opts = optStr.split(/\s*,\s*/);
					} else {
						token.opts = [optStr];
					}
				}
			} else {
				token.part = part;
			}
			result.push(token);
		} else {
			result.push(part);
		}
	});
	return result;
}

var format1 = "{G}{N}年{M}月{D}日（{Y}）";

function gengouPart(kdate, opts){
	var style = "2";
	if( opts ){
		opts.forEach(function(opt){
			if( ["2", "1", "a", "alpha"].indexOf(opt) >= 0 ){
				style = opt;
			}
		})
	}
	switch(style){
		case "2": return kdate.gengou;
		case "1": return kdate.gengou[0]; 
		case "a": return gengouToAlpha(kdate.gengou)[0]; 
		case "alpha": return gengouToAlpha(kdate.gengou);
		default: return kdate.gengou;
	}
}

function numberPart(num, opts){
	var zenkaku = false;
	var width = 1;
	var gannen = false;
	if( opts ){
		opts.forEach(function(opt){
			switch(opt){
				case "1": width = 1; break;
				case "2": width = 2; break;
				case "z": zenkaku = true; break;
				case "g": gannen = true; break;
			}
		});
	}
	var result = num.toString();
	if( zenkaku ){
		result = result.split().map(alphaDigitToZenkaku).join("");
	}
	if( width > 1 && num < 10 ){
		result = (zenkaku ? "０" : "0") + result;
	}
	return result;
}

function nenPart(kdate, opts){
	if( opts && kdate.nen === 1 && opts.indexOf("g") >= 0 ){
		return "元";
	} else {
		return numberPart(kdate.nen, opts);
	}
}

function youbiPart(kdate, opts){
	var style;
	if( opts ){
		opts.forEach(function(opt){
			if( ["1", "2", "3", "alpha"].indexOf(opt) >= 0 ){
				style = opt;
			}
		})
	}
	switch(style){
		case "1": return kdate.youbi;
		case "2": return kdate.youbi + "曜";
		case "3": return kdate.youbi + "曜日";
		case "alpha": return dayOfWeek[kdate.dayOfWeek];
		default: return kdate.youbi;
	}
}

function format(formatStr, kdate){
	var output = [];
	var tokens = parseFormatString(formatStr);
	tokens.forEach(function(token){
		if( typeof token === "string" ){
			output.push(token);
		} else {
			switch(token.part){
				case "G": output.push(gengouPart(kdate, token.opts)); break;
				case "N": output.push(nenPart(kdate, token.opts)); break;
				case "M": output.push(numberPart(kdate.month, token.opts)); break;
				case "D": output.push(numberPart(kdate.day, token.opts)); break;
				case "Y": output.push(youbiPart(kdate, token.opts)); break;
			}
		}
	})
	return output.join("");
}

exports.format = function(){
	var narg = arguments.length;
	var arg;
	if( narg === 0 ){
		return format(format1, new KanjiDate(new Date()));
	} else if( narg === 1 ){
		arg = arguments[0];
		if( isDateObject(arg) ){
			return format(format1, new KanjiDate(arg));
		}
	}
	throw new Error("invalid format call");
}