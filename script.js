 const API_KEY = 'caf43028648b40fe86b103215252508'; // My API
    const BASE = 'https://api.weatherapi.com/v1';

    // DOM refs
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    // to search a city and provide city name
    searchBtn.addEventListener('click', ()=> doSearch(cityInput.value.trim()));
    cityInput.addEventListener('keyup', (e)=>{ 
      if(e.key==='Enter') doSearch(cityInput.value.trim()); });

    async function doSearch(q){
      if(!q){ showError('Please enter a city or location.'); return; 

      }
      try{
       // showPopup('Loading…');
        const url = `${BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=5&aqi=no&alerts=no`;
        const res = await fetch(url);
        if(!res.ok){ 
          if(res.status===400) throw new Error('Invalid location'); 
          else throw new Error('API error: '+res.status); 
        }
        const data = await res.json();
        currentData = data;
        // save recent
      //  addToRecent(q);
        renderAll(data);
      }catch(err){ 
        console.error(err); 
        showError(err.message||'Failed to load weather'); // print error when not to load 

      }
    }

  

    // render functions
    function renderAll(data){
      weatherContainer.classList.remove('invisible');
      localTime.textContent = `Local: ${data.location.localtime}`;
     
    }


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
