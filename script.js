let openMenuFor = null;
let globalMenu = document.createElement("div");
globalMenu.className = "dropdown";
globalMenu.style.position = "fixed";
globalMenu.style.display = "none";
document.body.appendChild(globalMenu);
let d = JSON.parse(localStorage.getItem("d")) || [];
let drag = null;

// ================= SAVE =================
function save(){
  localStorage.setItem("d", JSON.stringify(d));
}

// ================= ADD =================
function add(){
  let t = document.getElementById("t").value.trim();
  let dt = document.getElementById("dt").value;

  if(!t) return;

  d.push({
    t,
    box:"inbox",
    deadline: dt ? new Date(dt).getTime() : null,
    created: Date.now(),
    done:false
  });

  document.getElementById("t").value="";
  document.getElementById("dt").value="";

  save();
  render();
}

// ENTER
["t","dt"].forEach(id=>{
  document.getElementById(id).addEventListener("keypress",e=>{
    if(e.key==="Enter") add();
  });
});

// ================= RENDER =================
function render(list = d){

  ["iu","inu","niu","ninu","inbox","done"].forEach(x=>{
    document.getElementById(x).innerHTML="";
  });

  list.forEach((x,i)=>{
    let div=document.createElement("div");
    div.className="task";
    div.draggable=true;
    div.setAttribute("data-id", i);
    div.style.position="relative";
    div.style.display="flex";
    div.style.alignItems="center";
    div.ondragstart=()=>drag=i;
    div.ondragend=()=>drag=null;

    let text=document.createElement("span");
    text.className = "task-text";
    text.innerText=x.t;

    let done=document.createElement("button");
    done.innerText="✓";
    done.onclick=()=>{
      x.box="done";
      x.done=true;
      x.completed = Date.now();
      save();
      render();
    };

    let menu = document.createElement("button");
    menu.innerText="⋮";
    menu.style.marginLeft="8px";

    let hoverTimeout;

menu.onmouseenter = ()=>{
  hoverTimeout = setTimeout(()=>{
    if(openMenuFor === i) return;

    openMenuFor = i;

    globalMenu.innerHTML = "";

    let edit = document.createElement("div");
    edit.innerText = "Edit";
    edit.onclick = ()=>{
      let nt = prompt("Edit task:", x.t);
      if(nt){
        x.t = nt;
        save();
        render();
      }
      globalMenu.style.display = "none";
      openMenuFor = null;
    };

    let del = document.createElement("div");
    del.innerText = "Delete";
    del.onclick = ()=>{
      d.splice(i,1);
      save();
      render();
      globalMenu.style.display = "none";
      openMenuFor = null;
    };

    globalMenu.appendChild(edit);
    globalMenu.appendChild(del);

    let rect = menu.getBoundingClientRect();

    globalMenu.style.top = rect.bottom + 6 + "px";
    globalMenu.style.left = rect.right - 140 + "px";

    globalMenu.style.display = "block";

  }, 250);
};

menu.onmouseleave = ()=>{
  hoverTimeout = setTimeout(()=>{
    globalMenu.style.display = "none";
    openMenuFor = null;
  }, 200);
};
globalMenu.onmouseenter = ()=>{
  clearTimeout(hoverTimeout);
};

globalMenu.onmouseleave = ()=>{
  hoverTimeout = setTimeout(()=>{
    globalMenu.style.display = "none";
    openMenuFor = null;
  }, 200);
};


    let divBox=document.getElementById(x.box);

    let right=document.createElement("div");
    right.style.display="flex";
    right.style.gap="10px";
    right.style.marginLeft="auto";
    right.style.alignItems="center";

    right.appendChild(done);
    right.appendChild(menu);

    div.appendChild(text);
    div.appendChild(right);

    divBox.appendChild(div);
  });
}

// CLOSE MENU
window.addEventListener("scroll", ()=>{
  globalMenu.style.display = "none";
  openMenuFor = null;
});

// ================= DRAG =================
function allow(e){e.preventDefault();}

function drop(e,b){
  e.preventDefault();
  if(drag===null) return;

  d[drag].box=b;
  save();
  render();
}

// ================= DAILY MODE =================
function todayView(){
  let today = new Date().toDateString();

  let filtered = d.filter(x=>{
    if(!x.deadline) return false;
    return new Date(x.deadline).toDateString()===today;
  });

  render(filtered);
}

// ================= CALENDAR VIEW =================
function showByDate(dateStr){
  let selected = new Date(dateStr).toDateString();

  let filtered = d.filter(x=>{
    if(!x.deadline) return false;
    return new Date(x.deadline).toDateString()===selected;
  });

  render(filtered);
}

// ================= ANALYTICS =================
function analytics(){
  let map={};

  d.forEach(x=>{
    let day=new Date(x.created).toDateString();
    map[day]=(map[day]||0)+1;
  });

  drawGraph(map);
}

// ================= GRAPH =================
function drawGraph(data){
  let canvas=document.getElementById("graph");
  if(!canvas) return;

  let ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);

  let keys=Object.keys(data);
  let values=Object.values(data);

  let max=Math.max(...values,1);

  keys.forEach((k,i)=>{
    let h = (values[i]/max)*200;
    ctx.fillRect(i*40,250-h,20,h);
  });
}

// ================= TIMER =================
function updateTime(){
  d.forEach((x,i)=>{

    let el=document.querySelector(`[data-id='${i}']`);
    if(!el) return;

    let text=el.querySelector(".task-text");

    // COMPLETED
    if(x.done){
      if(x.completed && x.created){
        let diff = x.completed - x.created;

        if(isNaN(diff) || diff < 0){
          text.innerHTML = x.t;
          return;
        }

        let h=Math.floor(diff/3600000);
        let m=Math.floor((diff%3600000)/60000);

        text.innerHTML = `${x.t} <span style="color:#34d399">(Completed in ${h}h ${m}m)</span>`;
      } else {
        text.innerHTML = x.t;
      }
      return;
    }

    // ACTIVE
    if(!x.deadline) return;

    let diff=x.deadline - Date.now();

    if(diff<=0){
      text.innerHTML = `${x.t} <span style="color:#f87171">[Overdue]</span>`;
    }else{
      let h=Math.floor(diff/3600000);
      let m=Math.floor((diff%3600000)/60000);
      let s=Math.floor((diff%60000)/1000);

      text.innerHTML = `${x.t} (${h}h ${m}m ${s}s)`;
    }
  });
}

// ================= CLEAR COMPLETED =================
function clearDone(){
  d = d.filter(x => x.box !== "done");
  save();
  render(d);
}

// ================= MODE =================
function mode(){
  document.body.classList.toggle("light");
}

// ================= INIT =================
setInterval(updateTime,1000);
render();