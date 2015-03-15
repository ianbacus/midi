#include "base.h"

Base::PitchMap Base::config()
{
    Base::PitchMap initmap;
    int value;
    int tuning[6];
    tuning[0] = 28;  //E
    tuning[1] = 33; //A
    tuning[2] = 39; //D
    tuning[3] = 43; //G
    tuning[4] = 47; //B
    tuning[5] = 52; //E
     for(int string_ind = 0;string_ind<6;string_ind++)
    {
        for(int fret_ind = 0; fret_ind<20; fret_ind++)
        {
            {
                value = tuning[string_ind] + fret_ind;
                cout << "gridmap: inserting " << value << " at coordinate point " << string_ind <<", " << fret_ind << endl;
                //tab_matrix[string_ind][fret_ind] = value;
                pair<int,int> map_point = make_pair(string_ind,fret_ind);
                initmap[value].push_back(&map_point); //add note to (note : location on fretboard) pitch_to_frets. this will help for determining how many placements there are for a note, and quickly indexing them (is this any faster than indexing the array? TODO)
            	cout << value <<  "first/string " << (pitch_to_frets_map.at(value))[0]->first;
            	cout << "second/fret "<< (pitch_to_frets_map.at(value))[0]->second << endl;
            	
            }
        }
    }
    return initmap;
}


int Base::get_string_pos(int pitch,int index) const
{
	//cout << pitch << " is on string " << ((pitch_to_frets_map.at(pitch))[index]->first) << endl;
	int ret;
	try {
		ret = (pitch_to_frets_map.at(pitch))[index]->first;
	}
	catch (const std::out_of_range& oor) {
		std::cerr << "Out of Range error: " << oor.what() << '\n';
		//cout << "uh oh";
	}
	return ret;
	
}

int Base::get_fret_pos(int pitch, int index) const
{
	//const vector<pair<int,int>* > pairy = (pitch_to_frets_map.find(pitch)->second);
	//cout << pairy[index]->second << endl;
	//cout << pitch << " is on fret " << ((pitch_to_frets_map.at(pitch))[index]->second) << endl;
	int ret;
	try {
		ret = (pitch_to_frets_map.at(pitch))[index]->second;
	}
	catch (const std::out_of_range& oor) {
		std::cerr << "Out of Range error: " << oor.what() << '\n';
		//cout << "uh oh";
	}
	return ret;
}

int Base::get_pitch_to_frets_entry_size(int pitch) const
//should be renamed "get_pitch_to_frets_vector_size". Takes pitch as an input, searches the base map.
//returns the size of a vector of tab matrix coordinates associated with a pitch. Equivalently, returns the number
// of frettable locations for a note.
{
//	cout << "entry is " << (pitch_to_frets_map.find(pitch)->second).size() << " units long" << endl;
	return (pitch_to_frets_map.at(pitch)).size();

}
Base::PitchMap Base::pitch_to_frets_map = Base::config();

