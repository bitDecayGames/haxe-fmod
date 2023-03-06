/**
* Jaxe - Javascript FMOD bindings for Haxe
*
* The MIT License (MIT)
*
* Copyright (c) 2020 Tanner Moore
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

class jaxe {
	// FMOD engine
	static FMOD = {};
	// Loaded bank dictionary
	static loadedBanks = {};
	// Fmod System
	static gSystem = {};
	// Fmod Core System
	static gSystemCore = {};
	// Variable used to enable audio once the screen has been clicked
	static gAudioResumed = false;        
	// Variable used to let the game know when FMOD is ready to be used
	static FmodIsInitialized = false;      
	// Cache of any named event instances
	static loadedEventInstances = {};
	// Callback flags
	static eventCallbacksFlagsDictionary = {};


	// Debug flag
	static fmod_debug = false;

	static fmod_set_debug(onOff){
		jaxe.fmod_debug = onOff;
	}
	static fmod_is_initialized() {
		return jaxe.FmodIsInitialized;
	}
	static fmod_init(numChannels){ 
		if (jaxe.fmod_debug) console.log("Initializing HaxeFmod");
		jaxe.FMOD['preRun'] = jaxe.preRun;                             // Will be called before FMOD runs, but after the Emscripten runtime has initialized
		jaxe.FMOD['onRuntimeInitialized'] = jaxe.onRuntimeInitialized; // Called when the Emscripten runtime has initialized
		jaxe.FMOD['TOTAL_MEMORY'] = 64*1024*1024;                      // Allocates an arbitrarily large amount of memory for the FMOD audio engine
		FMODModule(jaxe.FMOD);
	}
	static fmod_update(){
		var result;
		result = jaxe.gSystem.update();
		jaxe.CHECK_RESULT(result, 'system update() failed');
	}

	// This is not actually called by anything
	static fmod_load_bank(bankFilePath){
		if (jaxe.fmod_debug) console.log('loading bank: ' + bankFilePath);
		var result;
		var outval = {};
		result = jaxe.gSystem.loadBankFile("/" + bankFilePath, jaxe.FMOD.STUDIO_LOAD_BANK_DECOMPRESS_SAMPLES, outval);
		jaxe.CHECK_RESULT(result, 'loadBankFile() call failed for ' + bankFilePath);
		jaxe.loadedBanks[bankFilePath] = outval.val;
	}
	static fmod_unload_bank(bankFilePath){
		if (jaxe.fmod_debug) console.log('unloading bank: ' + bankFilePath);
		var result;
		result = jaxe.loadedBanks[bankFilePath].unload();
		jaxe.CHECK_RESULT(result, 'unload() call failed for ' + bankFilePath);
		jaxe.loadedBanks[bankFilePath] = undefined;
	}
	static fmod_create_event_instance_one_shot(eventPath){
		if (jaxe.fmod_debug) console.log('Creating one shot of: ' + eventPath);
		
		var result = {};

		var description = {};
		result = jaxe.gSystem.getEvent(eventPath, description);
		jaxe.CHECK_RESULT(result, 'getEvent() call failed for ' + eventPath);

		var instance = {};
		result = description.val.createInstance(instance);
		jaxe.CHECK_RESULT(result, 'createInstance() call failed for ' + description.val);

		result = instance.val.start();
		jaxe.CHECK_RESULT(result, 'start() call failed for ' + instance.val);

		result = instance.val.release();
		jaxe.CHECK_RESULT(result, 'release() call failed for ' + instance.val);

	}
	static fmod_create_event_instance_named(eventPath, eventInstanceName){
		if (jaxe.fmod_debug) console.log('Creating an instnce of ' + eventPath + 'with the name: ' + eventInstanceName);

		var result = {};
		if (jaxe.loadedEventInstances[eventInstanceName]) {
			if (jaxe.fmod_debug) console.log('Event instance is already loaded: ' + eventInstanceName + '. Overwriting it with ' + eventPath);
			result = jaxe.loadedEventInstances[eventInstanceName].stop(jaxe.FMOD.STUDIO_STOP_IMMEDIATE);
			jaxe.CHECK_RESULT(result, 'Tried stopping old event instance, but failed ' + eventInstanceName);
		}

		var description = {};
		result = jaxe.gSystem.getEvent(eventPath, description);
		jaxe.CHECK_RESULT(result, 'getEvent() call failed for ' + eventPath);

		var instance = {};
		result = description.val.createInstance(instance);
		jaxe.CHECK_RESULT(result, 'createInstance() call failed for ' + description.val);

		result = instance.val.start();
		jaxe.CHECK_RESULT(result, 'start() call failed for ' + instance.val);

		jaxe.loadedEventInstances[eventInstanceName] = instance.val;
	}
	static fmod_is_event_instance_loaded(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Checking if ' + eventInstanceName + ' is loaded');
		return !!jaxe.loadedEventInstances[eventInstanceName]
	}
	static fmod_play_event_instance(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Playing event instance: ' + eventInstanceName);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}
		var result;
		result = jaxe.loadedEventInstances[eventInstanceName].start()
		jaxe.CHECK_RESULT(result, 'start() call failed for ' + eventInstanceName);
	}

	static fmod_set_pause_for_all_events_on_bus(busPath, shouldBePaused){
		var bus = {};

		var result;
		result = jaxe.gSystem.getBus(busPath, bus)
		jaxe.CHECK_RESULT(result, 'Failed to get bus');
		result = bus.val.setPaused(shouldBePaused);
		jaxe.CHECK_RESULT(result, 'Failed to set pause on all events');
	}

	static fmod_stop_all_events_on_bus(busPath){
		var bus = {};

		var result;
		result = jaxe.gSystem.getBus(busPath, bus)
		jaxe.CHECK_RESULT(result, 'Failed to get bus');
		result = bus.val.stopAllEvents(jaxe.FMOD.STUDIO_STOP_IMMEDIATE);
		jaxe.CHECK_RESULT(result, 'Failed to stop all events');
	}

	static fmod_set_pause_on_event_instance(eventInstanceName, shouldBePaused){
		if (jaxe.fmod_debug) console.log('Setting pause status of ' + eventInstanceName + ' to ' + shouldBePaused);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}
		var result;
		result = jaxe.loadedEventInstances[eventInstanceName].setPaused(shouldBePaused);
		jaxe.CHECK_RESULT(result, 'setPaused() call failed for ' + eventInstanceName);
	}
	static fmod_stop_event_instance(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Stopping event instance: ' + eventInstanceName);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}
		var result;
		result = jaxe.loadedEventInstances[eventInstanceName].stop(jaxe.FMOD.STUDIO_STOP_ALLOWFADEOUT);
		jaxe.CHECK_RESULT(result, 'stop() call failed for ' + eventInstanceName);

	}
	static fmod_stop_event_instance_immediately(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Stopping event instance immediately: ' + eventInstanceName);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}
		var result;
		result = jaxe.loadedEventInstances[eventInstanceName].stop(jaxe.FMOD.STUDIO_STOP_IMMEDIATE);
		jaxe.CHECK_RESULT(result, 'stop() call failed for ' + eventInstanceName);

	}
	static fmod_release_event_instance(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Releasing event instance: ' + eventInstanceName);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}

		var result;
		result = jaxe.loadedEventInstances[eventInstanceName].stop(jaxe.FMOD.STUDIO_STOP_IMMEDIATE);
		jaxe.CHECK_RESULT(result, 'stop() call failed for ' + eventInstanceName);

		result = jaxe.loadedEventInstances[eventInstanceName].release();
		jaxe.CHECK_RESULT(result, 'release() call failed for ' + eventInstanceName);

		jaxe.loadedEventInstances[eventInstanceName] = undefined;
	}
	static fmod_is_event_instance_playing(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Checking if ' + eventInstanceName + ' is playing');
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded. Returning false.");
			return false;
		}

		var result;
		var outval = {};
		result = jaxe.loadedEventInstances[eventInstanceName].getPlaybackState(outval);
		jaxe.CHECK_RESULT(result, 'getPlaybackState() call failed for ' + eventInstanceName);

		return (outval.val == jaxe.FMOD.STUDIO_PLAYBACK_PLAYING);
	}
	static fmod_get_event_instance_playback_state(eventInstanceName){
		if (jaxe.fmod_debug) console.log('Getting playback state of ' + eventInstanceName);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}

		var result;
		var outval = {};
		result = jaxe.loadedEventInstances[eventInstanceName].getPlaybackState(outval);
		jaxe.CHECK_RESULT(result, 'getPlaybackState() call failed for ' + eventInstanceName);

		return outval.val;
	}
	static fmod_get_event_instance_param(eventInstanceName, paramName){
		if (jaxe.fmod_debug) console.log('Getting event instance param (' + paramName + ') from ' + eventInstanceName);
		if (!jaxe.loadedEventInstances[eventInstanceName]) {
			console.log("FMOD Error: Event instance " + eventInstanceName + "is not loaded!");
			return;
		}

		var result;
		var outval = {};
		var outvalFinal = {};
		result = jaxe.loadedEventInstances[eventInstanceName].getParameterByName(paramName, outval, outvalFinal);
		jaxe.CHECK_RESULT(result, 'getParameterByName() call failed for ' + eventInstanceName);

		return outvalFinal.val;
	}
	static fmod_set_event_instance_param(eventInstanceName, paramName, value){
		if (jaxe.fmod_debug) console.log('Setting event instance pram (' + paramName + ') to ' + value + ' for ' + eventInstanceName);
		if(!jaxe.loadedEventInstances[eventInstanceName]){
			console.log('FMOD Error: Cannot find event instance: ' + eventInstanceName);
			return;
		}

		var result = {};
		result = jaxe.loadedEventInstances[eventInstanceName].setParameterByName(paramName, value, false);
		jaxe.CHECK_RESULT(result, 'setParameterByName() call failed for ' + eventInstanceName);
	}

	//// Callbacks

	static GetEventInstancePath(eventInstance) {
		var result = {};

		var description = {};
		result = eventInstance.getDescription(description);
		jaxe.CHECK_RESULT(result, 'getDescription() call failed for event instance');

		var path = {}, size = 100, retrieve = 0;
		result = description.val.getPath(path, size, retrieve)
		jaxe.CHECK_RESULT(result, 'getPath() call failed for event instance');

		if (!path.val){
			console.log('Fmod Callback could not find description of event for event instance');
		}

		return path.val;
	}

	static GetCallbackType(type, event, parameters)
	{
		var eventInstancePath = jaxe.GetEventInstancePath(event);
		if(jaxe.eventCallbacksFlagsDictionary[eventInstancePath] == undefined) {
			console.log('FMOD Error: Cannot find event instance path in flags dictionary: ' + eventInstancePath);
			return jaxe.FMOD.FMOD_ERR_EVENT_NOTFOUND;
		}

		jaxe.eventCallbacksFlagsDictionary[eventInstancePath] = jaxe.eventCallbacksFlagsDictionary[eventInstancePath] | type;
		return jaxe.FMOD.OK;
	}

	static fmod_set_callback_tracking_for_event_instance(eventInstanceName) {
		if (jaxe.fmod_debug) console.log('Setting playback listener to track ' + eventInstanceName);
		if(!jaxe.loadedEventInstances[eventInstanceName]){
			console.log('FMOD Error: Cannot find event instance: ' + eventInstanceName);
		}
		
		var eventInstancePath = jaxe.GetEventInstancePath(jaxe.loadedEventInstances[eventInstanceName]);
		if (!eventInstancePath) {
			console.log('FMOD Error: No event path found for ' + eventInstancePath);
		}
		
		var result = {};
		result = jaxe.loadedEventInstances[eventInstanceName].setCallback(jaxe.GetCallbackType, jaxe.FMOD.STUDIO_EVENT_CALLBACK_ALL);
		jaxe.CHECK_RESULT(result, 'setCallback() call failed for ' + eventInstanceName);

		jaxe.eventCallbacksFlagsDictionary[eventInstancePath] = 0x00000000;
	}

	static fmod_check_callbacks_for_event_instance(eventInstanceName, callbackEventMask){
		if(!jaxe.loadedEventInstances[eventInstanceName]){
			console.log('FMOD Error: Cannot find event instance: ' + eventInstanceName);
			return;
		}

		var eventInstancePath = jaxe.GetEventInstancePath(jaxe.loadedEventInstances[eventInstanceName]);
		if (!eventInstancePath) {
			console.log('FMOD Error: No event path found for ' + eventInstanceName);
			return;
		}

		var eventHappened;
		eventHappened = jaxe.eventCallbacksFlagsDictionary[eventInstancePath] & callbackEventMask;
		jaxe.eventCallbacksFlagsDictionary[eventInstancePath] &= ~callbackEventMask;
		return eventHappened;
	}

	// Simple error checking function for all FMOD return values.
	static CHECK_RESULT(result, message='')
	{
		if (result != jaxe.FMOD.OK)
		{
			if (message == ''){
				console.log(jaxe.FMOD.ErrorString(result));
			} else {
				console.log(message + ': ' + jaxe.FMOD.ErrorString(result));
			}
		}
	}

	static preRun = function() {
		var fileName;
		var folderName = "/";
		var canRead = true;
		var canWrite = false;
	
		fileName = [
			"Master.bank",
			"Master.strings.bank",
		];
	
		for (var count = 0; count < fileName.length; count++)
		{
			console.log('Mounting bank file: ' + fileName[count])

			var applicationRoot = window.location.pathname;
			var gameRoot = applicationRoot.substring(0, applicationRoot.lastIndexOf("/"));
			var fileUrl = gameRoot + "/assets/fmod/Desktop/";

			// Mounts a local file so that FMOD can recognize it when calling a function that uses a filename (ie loadBank/createSound)
			jaxe.FMOD.FS_createPreloadedFile(folderName, fileName[count], fileUrl + fileName[count], canRead, canWrite);
		}
	}
	static onRuntimeInitialized = function(){
		// A temporary empty object to hold our system
		var outval = {};
		var result;
	
		console.log("Creating FMOD System object\n");
	
		// Create the system and check the result
		result = jaxe.FMOD.Studio_System_Create(outval);
		jaxe.CHECK_RESULT(result);
	
		console.log("grabbing system object from temporary and storing it\n");
	
		// Take out our System object
		jaxe.gSystem = outval.val;
	
		result = jaxe.gSystem.getCoreSystem(outval);
		jaxe.CHECK_RESULT(result);
	
		jaxe.gSystemCore = outval.val;
		
		// Optional.  Setting DSP Buffer size can affect latency and stability.
		// Processing is currently done in the main thread so anything lower than 2048 samples can cause stuttering on some devices.
		console.log("set DSP Buffer size.\n");
		result = jaxe.gSystemCore.setDSPBufferSize(2048, 2);
		jaxe.CHECK_RESULT(result);
		
		// Optional.  Set sample rate of mixer to be the same as the OS output rate.
		// This can save CPU time and latency by avoiding the automatic insertion of a resampler at the output stage.
		console.log("Set mixer sample rate");
		result = jaxe.gSystemCore.getDriverInfo(0, null, null, outval, null, null);
		jaxe.CHECK_RESULT(result);
		result = jaxe.gSystemCore.setSoftwareFormat(outval.val, jaxe.FMOD.SPEAKERMODE_DEFAULT, 0)
		jaxe.CHECK_RESULT(result);
	
		// 'click' for desktop
		document.addEventListener('click', function () {
			if (!jaxe.gAudioResumed) {
				console.log("resuming audio in response to click event");
			}
			jaxe.resumeAudio(false);
		});
		// 'touchstart' for mobile
		document.addEventListener('touchstart', function () {
			if (!jaxe.gAudioResumed) {
				console.log("resuming audio in response to touchstart event");
		}
			jaxe.resumeAudio(false);
		});

		console.log("initialize FMOD\n");
	
		// 1024 virtual channels
		// The STUDIO_INIT_LIVEUPDATE flag exists, but the Live Update feature on HTML5 is unsupported by FMOD
		result = jaxe.gSystem.initialize(1024, jaxe.FMOD.STUDIO_INIT_NORMAL, jaxe.FMOD.INIT_NORMAL, null);
		jaxe.CHECK_RESULT(result);
		
		// Starting up your typical JavaScript application loop
		console.log("initialize Application\n");

		// Set the framerate to 50 frames per second, or 20ms.
		console.log("Start game loop\n");
		
		window.setInterval(jaxe.updateFmod, 20);

		result = jaxe.gSystem.loadBankFile("/" + "Master.bank", jaxe.FMOD.STUDIO_LOAD_BANK_DECOMPRESS_SAMPLES, outval);
		jaxe.CHECK_RESULT(result);
		jaxe.loadedBanks["Master.bank"] = outval.val;

		result = jaxe.gSystem.loadBankFile("/" + "Master.strings.bank", jaxe.FMOD.STUDIO_LOAD_BANK_DECOMPRESS_SAMPLES, outval);
		jaxe.CHECK_RESULT(result);
		jaxe.loadedBanks["Master.strings.bank"] = outval.val;
		jaxe.FmodIsInitialized = true;
	
		return jaxe.FMOD.OK;
	}

	static resumeAudio(force)
	{
		if (force || !jaxe.gAudioResumed)
		{
			console.log("Resetting audio driver based on user input.");
			if (force) {
				console.log("forcefully");
			}
			var result;
			result = jaxe.gSystemCore.mixerSuspend();
			jaxe.CHECK_RESULT(result);
			result = jaxe.gSystemCore.mixerResume();
			jaxe.CHECK_RESULT(result);

			jaxe.gAudioResumed = true;
		}
	}

	// Needs to be a local function to play nicely with setInterval
	static updateFmod() {
		jaxe.gSystem.update();
	}
}