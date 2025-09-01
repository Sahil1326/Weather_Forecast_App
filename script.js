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
    const feelsLike = document.getElementById('feelsLike');
    const hourlyList = document.getElementById('hourlyList');
    const forecastList = document.getElementById('forecastList');
    const windText = document.getElementById('windText');
    const humidityText = document.getElementById('humidityText');
    const pressureText = document.getElementById('pressureText');
    const useLocationBtn = document.getElementById('useLocation');
    const recentBtn = document.getElementById('recentBtn');
    const recentDropdown = document.getElementById('recentDropdown');
    const recentCount = document.getElementById('recentCount');
   const popupHolder = document.getElementById('popupHolder');
    const unitToggle = document.getElementById('unitToggle');
    const alertArea = document.getElementById('alertArea');

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
        const url = `${BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=7&aqi=no&alerts=no`;
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
      setBackgroundFor(data.current.condition.text);
      locationName.textContent = `${data.location.name}, ${data.location.region || data.location.country}`;
      localTime.textContent = `Local: ${data.location.localtime}`;
      conditionText.textContent = data.current.condition.text;
      conditionIcon.src = `https:${data.current.condition.icon}`;
      renderMainTemp(data);
      feelsLike.textContent = `Feels like ${data.current.feelslike_c}°C / ${data.current.feelslike_f}°F`;
      windText.textContent = `${data.current.wind_kph} kph ${data.current.wind_dir}`;
      humidityText.textContent = `${data.current.humidity}%`;
      pressureText.textContent = `${data.current.pressure_mb} mb`;
      renderHourly(data.forecast.forecastday[0].hour);
      renderForecast(data.forecast.forecastday);
      checkAlertsAndExtreme(data);
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

    // show by hourly
    function renderHourly(hours){
      hourlyList.innerHTML = '';
      hours.forEach(h =>{
        const card = document.createElement('div');
        card.className = 'min-w-[110px] p-2 rounded-md bg-white/5 flex flex-col items-center gap-2';
        const time = new Date(h.time).toLocaleTimeString([], {hour: 'numeric', minute:'numeric'});
        card.innerHTML = `<div class="text-xs">${time}</div>
                          <img src="https:${h.condition.icon}" alt="" class="w-10 h-10"/>
                          <div class="font-semibold">${Math.round(h.temp_c)}°C</div>
                          <div class="text-xs">${h.wind_kph} kph</div>`;
        hourlyList.appendChild(card);
      });
    }
// dhow weather for days
    function renderForecast(days){
      forecastList.innerHTML = '';
      days.forEach(d=>{
        const date = new Date(d.date).toLocaleDateString();
        const card = document.createElement('div');
        card.className = 'p-3 rounded-md bg-white/5 flex items-center gap-3 justify-between';
        card.innerHTML = `
          <div>
            <div class="font-semibold">${date}</div>
            <div class="text-sm text-slate-200">${d.day.condition.text}</div>
          </div>
          <div class="flex items-center gap-3">
            <img src="https:${d.day.condition.icon}" class="w-14 h-14" alt=""/>
            <div class="text-right">
              <div class="font-bold">${Math.round(d.day.avgtemp_c)}°C</div>
              <div class="text-xs">Wind ${d.day.maxwind_kph} kph</div>
              <div class="text-xs">Humidity ${d.day.avghumidity}%</div>
            </div>
          </div>`;
        forecastList.appendChild(card);
      });
    }

    function checkAlertsAndExtreme(data){
      alertArea.innerHTML = '';
      // Extreme temp: > 40°C
      const tempC = data.current.temp_c;
      if(tempC >= 40){
        const el = document.createElement('div');
        el.className = 'p-3 rounded-md bg-amber-600 text-black';
        el.textContent = 'Heat Alert — temperature is above 40°C. Take precautions!';
        alertArea.appendChild(el);
      }

      // weather alerts from API if any (WeatherAPI supports alerts in some responses but we disabled earlier)
      if(data.alerts && data.alerts.alert && data.alerts.alert.length){
        data.alerts.alert.forEach(a=>{
          const el = document.createElement('div');
          el.className = 'p-3 rounded-md bg-red-700 text-white mt-2';
          el.innerHTML = `<strong>${a.headline}</strong><div>${a.desc || ''}</div>`;
          alertArea.appendChild(el);
        });
      }
    }
    // use for changing background according to the condition
     function setBackgroundFor(condition){
      const cond = condition.toLowerCase();
      document.body.classList.remove('rainy','cloudy','sunny','snow');
      if(cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) document.body.classList.add('rainy');
      else if(cond.includes('cloud')) document.body.classList.add('cloudy');
      else if(cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard')) document.body.classList.add('snow');
      else document.body.classList.add('sunny');
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
