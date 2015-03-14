#include "Reader.h"
#include "MidiFile.h"
#include "Options.h"
#include "midi2melody.h"
#include "Visitor.h"
#include "Printvisitor.h"
#include "RotateVisitor.h"
#include <ctype.h>
#include <string.h>
#include <stdio.h>
#include <iostream>
#include <vector>
#include <iostream>




using namespace std;
/*
struct Note {
      double tick;
      double duration;
      int    pitch;
      void print_data() {cout << pitch << " for " << duration << ". Tick=" << tick << endl;}
};*/

/*
void read_chunk(Reader &ro)
{
  
	string type;
	string mtrk = "MTrk";
	string mthd = "MThd";
	
	ro.read_bytes_to_char(4,type);
	cout << type << endl;
//	if(type.compare(mthd) == 0)
	if(type == "MThd")
	{
	cout << "reading header chunk" << endl;
		ro.read_header_chunk();
	}
//	else if(type.compare(mtrk) == 0)
	else if(type == "MTrk")
	{
	cout << "reading track chunk" << endl;
		ro.read_track_chunk();
	}
	else
	{
	  cout << "fuckup" << endl;
	}

}


void read_file(Reader &ro)
{
	unsigned int track_cnt = 0;
	read_chunk(ro);
	while(track_cnt < 2) //ro.get_tracks())
	{
		read_chunk(ro);
		track_cnt++;
	}
}*/
//////////////////////////////
//
// convertToMelody --
//
/*
void convertToMelody(MidiFile& midifile, vector<Note>& melody) {
   int track = 0;
   midifile.joinTracks();
   
   midifile.absoluteTicks();
   if (track < 0 || track >= midifile.getNumTracks()) {
      cout << "Invalid track: " << track << " Maximum track is: "
           << midifile.getNumTracks() - 1 << endl;
   }
   int numEvents = midifile.getNumEvents(track);

   vector<int> state(128);   // for keeping track of the note states

   int i;
   for (i=0; i<128; i++) {
      state[i] = -1;
   }

   melody.reserve(numEvents);
   melody.clear();

   Note mtemp;
   int command;
   int pitch;
   int velocity;

   for (i=0; i<numEvents; i++) {
      command = midifile[track][i][0] & 0xf0;
      if (command == 0x90) {
         pitch = midifile[track][i][1];
         velocity = midifile[track][i][2];
         if (velocity == 0) {
            // note off
            goto noteoff;
         } else {
            // note on
            state[pitch] = midifile[track][i].tick;
         }
      } else if (command == 0x80) {
         // note off
         pitch = midifile[track][i][1];
noteoff:
         if (state[pitch] == -1) {
            continue;
         }
         mtemp.tick = state[pitch];
         mtemp.duration = midifile[track][i].tick - state[pitch];
         mtemp.pitch = pitch;
         melody.push_back(mtemp);
         state[pitch] = -1;
      }
   }
}
void test()
{
		
  MidiFile midifile;
  vector<Note> piece;
  int tracks;
  string filename;

	while(1)
	{
	  int track=0;
	 // Reader robj(fn);
	  //read_file(robj);
	   filename = "";
	   cin >> filename;
	   midifile = MidiFile(filename);
	   tracks = midifile.getTrackCount();
	   //int track = 0;
	   cout << tracks << " tracks." << endl;
	   while(track < tracks)
	   {
	   	cout << "Track " << track << " has " << midifile.getNumEvents(track) << " events." << endl;
	   	track++;
	   }
	   convertToMelody(midifile,piece);
	   for(auto n : piece)
	   {
	   //	n.print_data();
	   }
	}
}*/

int main(int argc, char* argv[]) {
Options options;

	
   checkOptions(options, argc, argv);
   MidiFile midifile(options.getArg(1));
   queue<Bar*> score= convertMidiFileToText(midifile);
   RotateVisitor* thefixer = new RotateVisitor();
   PrintVisitor* theprinter = new PrintVisitor();
   theprinter->print_out();
   return 0;
   
}
