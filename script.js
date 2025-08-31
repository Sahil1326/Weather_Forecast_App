 const API_KEY = 'caf43028648b40fe86b103215252508'; // My API
    const BASE = 'https://api.weatherapi.com/v1';

    // DOM refs
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    const suggestions = document.getElementById('suggestions');
    const weatherContainer = document.getElementById('weatherContainer');
    const todayCard = document.getElementById('todayCard');
    const locationName = document.getElementById('locationName');
    const localTime = document.getElementById('localTime');
    const conditionText = document.getElementById('conditionText');
    const conditionIcon = document.getElementById('conditionIcon');
    const tempMain = document.getElementById('tempMain');
    const tempUnitMain = document.getElementById('tempUnitMain');
    const useLocationBtn = document.getElementById('useLocation');
    const recentBtn = document.getElementById('recentBtn');
    const recentDropdown = document.getElementById('recentDropdown');
    const recentCount = document.getElementById('recentCount');
   const popupHolder = document.getElementById('popupHolder');
    const unitToggle = document.getElementById('unitToggle');
   

    // state
    let recent = JSON.parse(localStorage.getItem('weather:recent') || '[]');
    let currentData = null; // store last fetched response
    let preferUnit = 'C'; // 'C' or 'F' - only affects today's main display as requested

    // Utils
    function showPopup(message, kind='info', timeout=5000){
      const el = document.createElement('div');
      el.className = `p-3 rounded-md mb-2 ${kind==='error'? 'bg-red-600' : 'bg-black/60'} text-white shadow-lg`;
      el.textContent = message;
      popupHolder.appendChild(el);
      setTimeout(()=> el.remove(), timeout);
    }

    function showError(message){
      showPopup(message, 'error', 6000);
    }

    function updateRecentUI(){
      recentCount.textContent = `(${recent.length})`;
      if(!recent.length){ 
        recentDropdown.innerHTML = '<div class="text-slate-300 text-sm p-2">No recent searches</div>'; 
        return;
       }
      recentDropdown.innerHTML = '';
      recent.slice().reverse().forEach(city=>{
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-2 hover:bg-white/5 rounded-sm';
        btn.textContent = city;
        btn.onclick = ()=> doSearch(city);
        recentDropdown.appendChild(btn);
      });
      const clear = document.createElement('button');
      clear.className='w-full text-left p-2 mt-2 bg-red-600 rounded-sm';
      clear.textContent='Clear recent';
      clear.onclick = ()=>{ 
        localStorage.removeItem('weather:recent'); 
        recent = []; 
        updateRecentUI(); 
      }
      recentDropdown.appendChild(clear);
    }

    // toggle recent dropdown
    recentBtn.addEventListener('click', ()=>{
      recentDropdown.classList.toggle('hidden');
    });

    // unit toggle
    unitToggle.addEventListener('click', ()=>{
      preferUnit = (preferUnit === 'C') ? 'F' : 'C';
      unitToggle.textContent = preferUnit==='C' ? '°C' : '°F';
      // update only today's main temperature
      if(currentData) renderMainTemp(currentData);
    });

    function debounce(fn, wait=300){ 
      let t; 
      return (...args)=>{ 
        clearTimeout(t); 
       t=setTimeout(()=>fn(...args), wait);
     }; 
    }

    // it is for autosuggest to search city
    async function fetchSuggestions(q){
      if(!q) { suggestions.classList.add('hidden'); suggestions.innerHTML=''; 
        return; 
      }
      try{
        const res = await fetch(`${BASE}/search.json?key=${API_KEY}&q=${encodeURIComponent(q)}`);
        if(!res.ok) throw new Error('Failed to fetch suggestions');
        const data = await res.json();
        renderSuggestions(data);
      }catch(e){ 
        console.error(e); 
      }
    }

    function renderSuggestions(list){
      suggestions.innerHTML = '';
      if(!list || !list.length){ 
        suggestions.classList.add('hidden'); 
        return; 
      }
      list.slice(0,8).forEach(it=>{
        const li = document.createElement('li');
        li.className = 'p-2 hover:bg-white/5 cursor-pointer flex justify-between items-center';
        li.innerHTML = `<div><strong>${it.name}</strong> <span class="text-slate-300 text-sm">${it.region?(', '+it.region):''} ${it.country?(', '+it.country):''}</span></div>`;
        li.onclick = ()=>{ 
          cityInput.value = `${it.name}${it.region? ', '+it.region: ''}${it.country? ', '+it.country: ''}`;
           suggestions.classList.add('hidden'); doSearch(cityInput.value); 
          };
        suggestions.appendChild(li);
      });
      suggestions.classList.remove('hidden');
    }

    cityInput.addEventListener('input', debounce((e)=> fetchSuggestions(e.target.value), 300));
    document.addEventListener('click', (e)=>{ 
      if(!e.target.closest('#suggestions') && !e.target.closest('#cityInput')) suggestions.classList.add('hidden'); 
    });

    // to search a city and provide city name
    searchBtn.addEventListener('click', ()=> doSearch(cityInput.value.trim()));
    cityInput.addEventListener('keyup', (e)=>{ 
      if(e.key==='Enter') doSearch(cityInput.value.trim()); });

    async function doSearch(q){
      if(!q){ showError('Please enter a city or location.'); return; 

      }
      try{
        showPopup('Loading…');
        const url = `${BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=5&aqi=no&alerts=no`;
        const res = await fetch(url);
        if(!res.ok){ 
          if(res.status===400) throw new Error('Invalid location'); 
          else throw new Error('API error: '+res.status); 
        }
        const data = await res.json();
        currentData = data;
        // save recent
        addToRecent(q);
        renderAll(data);
      }catch(err){ 
        console.error(err); 
        showError(err.message||'Failed to load weather'); // print error when not to load 

      }
    }

   function addToRecent(q){
      const existing = recent.indexOf(q);
      if(existing !== -1) recent.splice(existing,1);
      recent.push(q);
      if(recent.length>8) recent.shift();
      localStorage.setItem('weather:recent', JSON.stringify(recent));
      updateRecentUI();
    }

    // current location
    useLocationBtn.addEventListener('click', ()=>{
      if(!navigator.geolocation){ showError('Geolocation not supported in your browser.'); 
        return; 
      }
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        const {latitude, longitude} = pos.coords;
        doSearch(`${latitude},${longitude}`);
      }, (err)=>{ showError('Could not access location.');

       }, {timeout:10000});
    });

    // render functions
    function renderAll(data){
      weatherContainer.classList.remove('invisible');
      locationName.textContent = `${data.location.name}, ${data.location.region || data.location.country}`;
      localTime.textContent = `Local: ${data.location.localtime}`;
     
    }

    function renderMainTemp(data){
      const c = data.current.temp_c;
      const f = data.current.temp_f;
      if(preferUnit === 'C'){ 
        tempMain.textContent = Math.round(c); 
        tempUnitMain.textContent = '°C'; 
      }
      else { 
        tempMain.textContent = Math.round(f); 
        tempUnitMain.textContent = '°F';
       }
    }


    // handle API errors globally (simple wrapper)
    window.addEventListener('error', (e)=>{ 
      console.error(e); 
      showError('Unexpected error occurred'); 
    });

    
    updateRecentUI();

    // Accessibility: simple keyboard nav for suggestions
    cityInput.addEventListener('keydown', (e)=>{
      const visible = !suggestions.classList.contains('hidden');
      if(!visible) return;
      const items = Array.from(suggestions.querySelectorAll('li'));
      const active = suggestions.querySelector('.active');
      if(e.key === 'ArrowDown'){ e.preventDefault(); 
        if(!active){ items[0].classList.add('active');
          items[0].focus(); 
        }
         else { let i = items.indexOf(active); 
          active.classList.remove('active'); 
          items[(i+1)%items.length].classList.add('active');
         } 
        }
      if(e.key === 'ArrowUp'){ e.preventDefault(); 
        if(!active){ items[items.length-1].classList.add('active');

         }else
             { 
              let i = items.indexOf(active); active.classList.remove('active');
               items[(i-1+items.length)%items.length].classList.add('active'); 
              } 
            }
      if(e.key === 'Enter'){ const focused = suggestions.querySelector('.active');
       if(focused) focused.click(); 
      }
    });