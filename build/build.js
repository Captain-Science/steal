
steal(function(steal){
	var opts = {},
		window = (function(){return this}).call(null,0);
	
	/**
	 * 
	 * @parent stealtools
	 * 
	 * Builds an html page's JavaScript and CSS files by compressing and concatenating them into
	 * a single or several files.
	 * <h2>How it works</h2>
	 * <p><code>Steal.build</code> opens a page in Envjs to extract all scripts and styles
	 * from the page.  It compresses the resources into production.js and production.css
	 * files.</p>
	 * <p>Steal.build works with or without using steal.js, so it could work with other script loaders.</p>
	 * 
	 * 
	 * <h2>Building with steal.js.</h2>
	 * <p>Building with steal is easy, just point the <code>steal/buildjs</code> script at your page and
	 * give it the name of your application folder:</p>
	 * @codestart no-highlight
	 * js steal/buildjs path/to/page.html -to myapp
	 * @codeend 
	 * <p>If you generated a steal app or plugin, there's a handy script already ready for you:</p>
	 * @codestart no-highlight
	 * js myapp/scripts/build.js
	 * @codeend 
	 * <h2>Building without steal.js</h2>
	 * You can compress and package any page's JavaScript by adding <code>compress="true"</code>
	 * attributes to your script tag like the following:
	 * @codestart html
	 * &lt;script src="file1.js" type="text/javascript" compress="true">&lt;/script>
	 * &lt;script src="file2.js" type="text/javascript" compress="true">&lt;/script>		
	 * @codeend
	 * and then running either:
	 * @codestart no-highlight
	 * js steal/buildjs path/to/page.html -to [OUTPUT_FOLDER]
	 * @codeend 
	 * or: 
	 * @codestart no-highlight
	 * js steal/buildjs http://hostname/path/page.html -to [OUTPUT_FOLDER]
	 * @codeend  
	 * This will compress file1.js and file2.js into a file package named production.js an put it in OUTPUT_FOLDER.
	 * 
	 * <h2>Common Problems</h2>
	 * <p>If you are getting errors building a production build, it's almost certainly because Envjs is
	 * close, but not quite a fully featured browser.  So, you have to avoid doing things in your page that
	 * Envjs doesn't like before onload.  The most common problems are:</p>
	 * <h5>Malformed HTML or unescaped characters</h5>
	 * <p>Steal does not have as tolerant of an HTML parser as Firefox.  Make sure your page's tags look good.
	 * Also, make sure you escape characters like &amp; to &amp;amp;
	 * </p>
	 * <h5>DOM manipulations before onload</h5>
	 * <p>EnvJS supports most DOM manipulations.  But, it's not a graphical browser so it completely punts
	 * on styles and dimensional DOM features.  It's easy to protect against this, just wait until 
	 * document ready or onload to do these things.
	 * </p>
	 * <h5>Unending timeouts or intervals before onload</h5>
	 * <p>Envjs won't quit running until all timeouts or intervals have completed.  If you have a reoccuring
	 * 'process', consider starting it on document ready or onload.</p>
	 * @param {String} url an html page to compress
	 * @param {Object} options An object literal with the following optional values:
	 * <table class='options'>
	 * 	  <tr>
	 * 	      <th>Name</th><th>Description</th>
	 * 	  </tr>
	 * 	  <tr><td>to</td>
	 * 	  		<td>The folder to put the production.js and production.css files.</td></tr>
	 * 	  <tr><td>all</td>
	 * 		  <td>Concat and compress all scripts and styles.  By default, this is set to false, meaning
	 * 		  scripts and styles have to opt into being compress with the <code>compress='true'</code> attribute.</td></tr>
	 * 	</table>
	 */
	steal.build = function(url, options){
		options = steal.opts(options || {}, {
			//compress everything, regardless of what you find
			all : 1,
			//folder to build to, defaults to the folder the page is in
			to: 1
		})
		
		
		//out is the folder packages will be sent to
		options.to = options.to || (url.match(/https?:\/\//) ?  "" : url.substr(0, url.lastIndexOf('/'))  );
		if (options.to.match(/\\$/) == null && options.to != '') {
			options.to += "/";
		}
		
		print("Building to "+options.to);
		
		var opener = steal.build.open(url)
		for(var builder in steal.build.builders){
			steal.build.builders[builder](opener, options)
		}
	}
	steal.build.builders = {}; //builders
	
	var loadScriptText = function(src){
		var text = "",
			base = "" + window.location,
			url = src.match(/([^\?#]*)/)[1];
	
		if (url.match(/^\/\//)){
			url = steal.root.join( url.substr(2) ); //can steal be removed?
		}
		url = Envjs.uri(url, base);
	    
	    if(url.match(/^file\:/)) {
	        url = url.replace("file:/","");
	        text = readFile("/"+url);
	    }
	    
	    if(url.match(/^http\:/)) {
	        text = readUrl(url);
	    }
	
	    return text;
	};
	
	// types conversion
	steal.build.types = {
		'text/javascript': function( script ) {
			if (script.src) {
				return loadScriptText(script.src, script);
			}
			else {
				return script.text
			}
		},
		'text/css' : function( script ) {
			if (script.href) {
				return loadScriptText(script.href, script);
			}
			else {
				return script.text
			}
		},
		'text/ejs': function( script ) {
			var text = loadScriptText(script.src);
			var id = script.getAttribute("id");
			return $.View.registerScript("ejs", id, text);
		},
		'text/micro': function( script ) {
			var text = loadScriptText(script.src);
			var id = script.getAttribute("id");
			return $.View.registerScript("micro", id, text);
		},
		'text/jaml': function( script ) {
			var text = loadScriptText(script.src);
			var id = script.getAttribute("id");
			return $.View.registerScript("jaml", id, text);
		},
		'text/tmpl': function( script ) {
			var text = loadScriptText(script.src);
			var id = script.getAttribute("id");
			return $.View.registerScript("tmpl", id, text);
		},
		loadScriptText : loadScriptText
	}
	
	
	steal.build.open = function(url ){
		scriptProcessors = steal.extend({}, steal.build.types);
		var types = {}, 
			name,
			scripts = [];
			
		for(name in scriptProcessors){
			types[name] = true;
		}
		var oldSteal = window.steal || steal, 
			newSteal;
		delete window.steal;
		//load the page
		load('steal/rhino/env.js'); //reload every time
		Envjs(url, {scriptTypes: {"text/javascript" : true,"text/envjs" : true}, fireLoad: false, logLevel: 2,
	        afterScriptLoad: {".*": function( script ) { 
	                scripts.push(script);
	            }
	        },
	        onLoadUnknownTypeScript: function( script ) {
	            self.scripts.push(script);   
	        },
			afterInlineScriptLoad: function( script ) {
				scripts.push(script);   
	        }
	    }); 
		//set back steal
		newSteal = window.steal;
		window.steal = oldSteal;
		window.steal._steal = newSteal;
		//check if newSteal added any build types
		for(var buildType in newSteal.build.types){
			oldSteal.build.types[buildType] = newSteal.build.types[buildType];
		}
		
		
		return {
			each: function( type , func, ths ) {
				if(typeof type == 'function'){
					ths = func;
					func = type;
					type = 'script'
				}
		        var scripts = document.getElementsByTagName(type);
				for(var i = 0 ; i < scripts.length; i++){
					func.call(ths,scripts[i], this.getScriptContent(scripts[i]), i)
				}
			},
			getScriptContent: function( script ) {
				return steal.build.types[script.type] && steal.build.types[script.type](script, loadScriptText);
			},
			steal : newSteal,
			url : url
		}
	}
	
})







