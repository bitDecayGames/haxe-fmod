import faxe.Faxe;

class MainTest
{
	static function main()
	{
		Faxe.fmod_init(36);

		// Load a sound bank
		Faxe.fmod_load_bank("./Master Bank.bank");

		// Make sure to load the STRINGS file to enable loading 
		// stuff by FMOD Path
		Faxe.fmod_load_bank("./Master Bank.strings.bank");

		// Load a test event
		Faxe.fmod_load_event("event:/Music/PauseSong","song");
		Faxe.fmod_play_event("song");

		// Get and set an even parameter to change effect values
		trace("Lowpass param defaults to: " + Faxe.fmod_get_event_param("song", "ActivateTrack2"));
		trace("Setting it to 1");
		Faxe.fmod_set_param("song", "ActivateTrack2", 1.0);

		// Bad little forever loop to pump FMOD commands
		while (true)
		{
			// trace("event:/testEvent is playing: " + Faxe.fmod_event_is_playing("event:/testEvent"));
			Faxe.fmod_update();
		}
	}
}
