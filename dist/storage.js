import {builtinLanguages,keyInfo,lessonsFor} from './course.js';
export const STORAGE_KEY='ritm-v1';
export function emptyProfile(){return {profile:{name:''},history:[],customLanguages:{},selected:'ru',lessons:{},progress:{},settings:{colors:true,letters:true,hands:false}};}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function check(condition,message){if(!condition)throw new Error(message);}
function text(v,max,label){check(typeof v==='string'&&v.length<=max,`Некорректное поле «${label}».`);return v;}
function number(v,max,label){check(Number.isFinite(v)&&v>=0&&v<=max,`Некорректное поле «${label}».`);return v;}
export function parseBackup(input){
 check(object(input),'Файл должен содержать данные профиля Ритма.');
 let source=input;
 if('format' in input||'version' in input){check(input.format==='ritm-profile','Это не файл профиля Ритма.');check(input.version===1,'Версия файла пока не поддерживается.');source=input.data;}
 check(object(source)&&Array.isArray(source.history)&&object(source.settings)&&typeof source.selected==='string','В файле нет профиля Ритма. Выберите JSON, скачанный из тренажёра.');
 const result=emptyProfile();
 if(source.profile!==undefined){check(object(source.profile),'Некорректные данные профиля.');result.profile.name=text(source.profile.name,40,'имя').trim();}
 for(const key of ['colors','letters','hands'])if(source.settings[key]!==undefined){check(typeof source.settings[key]==='boolean','Настройки должны содержать переключатели true/false.');result.settings[key]=source.settings[key];}
 const custom=source.customLanguages??{};check(object(custom)&&Object.keys(custom).length<=50,'Некорректный список пользовательских раскладок.');
 for(const [id,l] of Object.entries(custom)){
  check(/^custom-[a-z0-9-]+$/.test(id)&&id.length<=80&&object(l)&&l.custom===true,'Некорректная пользовательская раскладка.');
  const name=text(l.name,30,'название языка'),layout=text(l.layout,30,'название раскладки');check(name.trim()&&layout.trim(),'У раскладки должно быть название.');
  const rows=l.rows,shift=l.shift;
  for(const list of [rows,shift])check(Array.isArray(list)&&list.length===4&&list.every((r,i)=>typeof r==='string'&&r.length===[13,12,11,10][i]&&!/[\s\u0000-\u001f\u007f-\u009f]/.test(r)),'Раскладка должна содержать ряды из 13, 12, 11 и 10 отдельных символов.');
  check(new Set(rows.join('')).size===rows.join('').length,'В раскладке повторяются клавиши.');
  const lessonText=text(l.text,1500,'учебный текст');check(lessonText.trim().length>0,'Учебный текст не должен быть пустым.');
  const language={name,layout,rows:[...rows],shift:[...shift],text:lessonText,custom:true};check(Array.from(lessonText).every(c=>keyInfo(language,c)),'Учебный текст содержит символы вне своей раскладки.');
  result.customLanguages[id]=language;
 }
 const languages={...builtinLanguages,...result.customLanguages};check(Object.hasOwn(languages,source.selected),'Выбранного языка нет в файле.');result.selected=source.selected;
 const positions=source.lessons??{};check(object(positions),'Некорректный список выбранных уроков.');
 for(const [id,index] of Object.entries(positions)){check(Object.hasOwn(languages,id)&&Number.isInteger(index)&&index>=0&&index<lessonsFor(languages[id]).length,'В файле указан несуществующий урок.');result.lessons[id]=index;}
 check(source.history.length<=500,'В файле больше 500 занятий.');
 result.history=source.history.map(h=>{
  check(object(h)&&Object.hasOwn(languages,h.language)&&['lesson','practice'].includes(h.kind),'Некорректная запись истории занятий.');
  const date=text(h.date,100,'дата');check(Number.isFinite(Date.parse(date)),'Некорректная дата занятия.');
  check(h.kind==='practice'?h.lesson===null:Number.isInteger(h.lesson)&&h.lesson>=0&&h.lesson<lessonsFor(languages[h.language]).length,'В истории указан несуществующий урок.');
  const mistakes=h.mistakes??{};check(object(mistakes)&&Object.keys(mistakes).length<=100,'Некорректная статистика ошибок.');const cleanMistakes={};
  for(const [char,count] of Object.entries(mistakes)){check(char.length===1&&keyInfo(languages[h.language],char)&&Number.isInteger(count)&&count>0&&count<=1000000,'Некорректная статистика ошибок.');cleanMistakes[char]=count;}
  const length=number(h.length,100000,'число символов');check(Number.isInteger(length),'Число символов должно быть целым.');
  return {date:new Date(date).toISOString(),language:h.language,kind:h.kind,lesson:h.lesson,title:text(h.title,160,'название занятия'),accuracy:number(h.accuracy,100,'точность'),speed:number(h.speed,10000000,'скорость'),duration:number(h.duration,31536000000,'время'),mistakes:cleanMistakes,length};
 });
 const progress=source.progress??{};check(object(progress),'Некорректный прогресс курса.');
 for(const [id,records] of Object.entries(progress)){
  check(Object.hasOwn(languages,id)&&object(records),'Некорректный прогресс курса.');result.progress[id]={};
  for(const [index,accuracy] of Object.entries(records)){check(/^(0|[1-9]\d*)$/.test(index)&&Number(index)<lessonsFor(languages[id]).length,'В прогрессе указан несуществующий урок.');result.progress[id][index]=number(accuracy,100,'точность урока');}
 }
 for(const h of result.history)if(h.kind==='lesson'){result.progress[h.language]??={};result.progress[h.language][h.lesson]=Math.max(result.progress[h.language][h.lesson]||0,h.accuracy);}
 return result;
}
export function makeBackup(data){return {format:'ritm-profile',version:1,exportedAt:new Date().toISOString(),data:parseBackup(data)};}
