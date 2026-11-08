/* 指南页：赛制 / 知识地图 / 资源库 三栏切换 */
(function(){
  var btns = document.querySelectorAll('#gtabs button');
  function go(id){
    for (var i=0;i<btns.length;i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-tab')===id);
    ['race','map','res'].forEach(function(k){
      var p=document.getElementById('pane-'+k);
      if(p) p.classList.toggle('on', k===id);
    });
    try { if (location.hash !== '#guide-' + id) history.replaceState(null, '', '#guide-' + id); } catch (e) {}
    window.scrollTo({top:0,behavior:'smooth'});
  }
  for (var i=0;i<btns.length;i++){
    btns[i].addEventListener('click', function(){ go(this.getAttribute('data-tab')); });
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href^="#guide-"]');
    if(!a) return;
    e.preventDefault();
    go(a.getAttribute('href').replace('#guide-',''));
  });
  var h = (location.hash||'').replace('#guide-','');
  if (['race','map','res'].indexOf(h)>=0) go(h);
})();
