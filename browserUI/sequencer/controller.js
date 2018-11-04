var sm = {
    BEGIN: 1,
    SELECTED: 2,
    DRAG: 3
};


var editModeEnumeration = {
	EDIT: 0,
	SELECT: 1,
	DELETE: 2
}

let c_this = undefined;


class SelectModeController
{
    constructor()
    {
        //SelectMode = sm.BEGIN;
    }

    OnMouseMove(event)
    {
        //case 1: render preview
        //case 2: move selected items
        //case 3:
    }
};

class EditModeController
{
    constructor()
    {
        //EditMode = em.BEGIN;
    }

    OnMouseMove(event)
    {
        //case 1: render preview
        //case 2: move selected items
        //case 3:
    }
};

class Controller
{
    constructor(view, model)
    {
        c_this = this;
        c_this.EditorMode = editModeEnumeration.EDIT;
        c_this.View = view;
        c_this.Model = model;
        c_this.CursorPosition = { x: -1, y: -1 };
        c_this.SelectorPosition = { x: -1, y: -1 };
        c_this.Playing = false;
        c_this.Hovering = false;
        c_this.SelectingGroup = false;
        c_this.GridPreviewList = [c_this.Model.Score];
        c_this.GridPreviewIndex = 0;
        c_this.EditModeColors = ['orange','blue','green'];

        c_this.NoteIndex = 0;
        c_this.PendingTimeout = null;


    }

    Initialize()
    {
        c_this.RenderGridArray();
    }

    RenderGridArray()
    {
        c_this.StopPlayingNotes();
        c_this.RenderMainGridBox()
        c_this.View.RenderGridArray(c_this.GridPreviewList.length, c_this.GridPreviewIndex);

    }

    RenderMainGridBox()
    {
        var editModeColor = c_this.EditModeColors[c_this.EditorMode];
        c_this.View.RenderNotes(c_this.Model.Score, editModeColor);
    }

    DeleteSelectedNotes()
    {
        var i = 0;
        for(var index = 0; index < c_this.Model.Score.length; index++)
        {
            var note = c_this.Model.Score[index]
            if(note.IsSelected)
            {
                c_this.Model.DeleteNoteWithIndex(index)
            }
        }
    }

    ModifySelectedNotes(transform)
    {
        c_this.Model.Score.forEach( function(note)
        {
            if(note.IsSelected)
            {
                transform(note);
            }
        });
    }

    DoActionOnAllNotes(transform)
    {
        c_this.Model.Score.forEach( function(note)
        {
            transform(note)
        });
    }

    CountSelectedNotes()
    {
        var selectCount = 0;
        c_this.ModifySelectedNotes(function(note)
        {
            selectCount++;}
        );

        return selectCount;
    }

    OnKeyUp(event)
    {
        switch(event.keyCode)
        {
        //Mode control: select, edit, delete
        case 88: //"x" key"
            console.log("Select mode");
            c_this.EditorMode = editModeEnumeration.SELECT;
            c_this.DeleteSelectedNotes(); //todo don't delete selected groups
            c_this.RenderMainGridBox()


            break;
        case 90: //"z" key"
            console.log("Edit mode");
            c_this.EditorMode = editModeEnumeration.EDIT;
            c_this.DeleteSelectedNotes(); //todo don't delete selected groups
            var previewNote = c_this.CreatePreviewNote();
            c_this.Model.AddNote(previewNote);
            c_this.RenderMainGridBox()

            break;
        case 68: //"d" key
            //Delete any selected notes, and enter delete mode
            c_this.DeleteSelectedNotes();
            c_this.EditorMode = editModeEnumeration.DELETE;
            c_this.RenderMainGridBox()
            break;

        case 32: //spacebar
            if(!c_this.Playing)
            {
                //Add all unselected notes to the playback buffer
                var playbackBuffer = []
                c_this.DoActionOnAllNotes(function(note)
                {
                    if(!note.IsSelected)
                    {
                        playbackBuffer.push(note);
                    }
                });

                c_this.PlayNotes(playbackBuffer);
            }
            else
            {
                c_this.StopPlayingNotes();
            }
            event.preventDefault();
            break;
        case 67: //"c" key"
            break;
        case 81: //"q" key
            break;
        case 87: //"w" key: Halve durations
            //c_this.ModifySelectedNotes(function(note){note.Duration = ceil(note.Duration /= 2);});
            break;
        case 69: //"e" key: Double durations
            c_this.CreateGridPreview();
            console.log(c_this.GridPreviewList);

            c_this.RenderGridArray();

            //c_this.ModifySelectedNotes(function(note){ note.Duration = min(32, note.Duration *= 2); });
            break;
        case 38: //up arrow: select grid

            event.preventDefault();
            if(c_this.GridPreviewIndex > 0)
            {
                c_this.GridPreviewList[c_this.GridPreviewIndex] = c_this.Model.Score;
                c_this.GridPreviewIndex--;

                c_this.Model.Score = c_this.GridPreviewList[c_this.GridPreviewIndex];
                c_this.RenderGridArray();

                console.log("Previous grid",c_this.GridPreviewIndex,c_this.GridPreviewList.length, c_this.Model.Score);
            }
            else {
                console.log("BOINK",c_this.GridPreviewIndex,c_this.GridPreviewList.length, c_this.Model.Score);
            }
            break;
        case 40: //down arrow: select grid
            event.preventDefault();
            if(c_this.GridPreviewIndex < c_this.GridPreviewList.length-1)
            {
                c_this.GridPreviewList[c_this.GridPreviewIndex] = c_this.Model.Score;
                c_this.GridPreviewIndex++;

                c_this.Model.Score = c_this.GridPreviewList[c_this.GridPreviewIndex];
                c_this.RenderGridArray();

                console.log("Next grid",c_this.GridPreviewIndex,c_this.GridPreviewList.length, c_this.Model.Score);
            }
            else
            {
                console.log("BOINK",c_this.GridPreviewIndex,c_this.GridPreviewList.length, c_this.Model.Score);
            }
            break;
        }
    }

    GetNextUnselectedNote()
    {
        var note = null;

        //Get the next note that isn't selected
        while(c_this.NoteIndex < c_this.Model.Score.length)
        {
            var note = c_this.Model.Score[c_this.NoteIndex ];

            c_this.NoteIndex++;
            if(!note.IsSelected)
            {
                break;
            }
            else
            {
                note = null;
            }

        }

        return note;
    }

    DoNotesOverlap(note1, note2)
    {
        var note1SearchStartTicks = note1.StartTimeTicks;
        var note1SearchEndTicks = note1SearchStartTicks + note1.Duration;

        var note2SearchStartTicks = note2.StartTimeTicks;
        var note2SearchEndTicks = note2SearchStartTicks + note2.Duration;

        var note2StartsDuringNote1 =
            (note1SearchStartTicks <= note2SearchStartTicks) && (note2SearchStartTicks < note1SearchEndTicks);

        var note1StartsDuringNote2 =
            (note2SearchStartTicks <= note1SearchStartTicks) && (note1SearchStartTicks < note2SearchEndTicks);

        var results = {
            'N1_Overlap':note1StartsDuringNote2,
            'N2_Overlap':note2StartsDuringNote1,
        };

        return results;
    }

    PlayChord(noteArray, noteIndex)
    {
        //Get all notes that play during this note, return the index of the first note that won't be played in this chord
        var leftSearchIndex = noteIndex - 1;
        var rightSearchIndex = noteIndex + 1;
        var currentNote = noteArray[noteIndex];
        var chordNotes = [currentNote];
        var returnIndex = noteArray.length;

        console.log("Searching",noteIndex)

        //search left
        while(leftSearchIndex >= 0)
        {
            var leftSearchNote = noteArray[leftSearchIndex];
            if(!leftSearchNote.IsSelected)
            {
                if(c_this.DoNotesOverlap(currentNote, leftSearchNote)['N1_Overlap'])
                {
                    chordNotes.push(leftSearchNote);
                }
                else
                {
                    break;
                }
            }

            leftSearchIndex--;
        }
        //search right
        while(rightSearchIndex < noteArray.length)
        {
            var rightSearchNote = noteArray[rightSearchIndex];

            if(!rightSearchNote.IsSelected)
            {
                if(c_this.DoNotesOverlap(currentNote, rightSearchNote)['N1_Overlap'])
                {
                    chordNotes.push(rightSearchNote);
                }
                else
                {
                    returnIndex = rightSearchIndex;
                    break;
                }
            }

            rightSearchIndex++;
        }

        chordNotes.forEach(function(note)
        {
            note.Play();
        });

        return returnIndex;
    }

    OnPlayAllNotes()
    {
        var playbackNoteArray = c_this.PlaybackNoteArray;
        var noteIndex = c_this.NoteIndex;
        var currentNote = playbackNoteArray[noteIndex];
        var nextNoteIndex = c_this.PlayChord(playbackNoteArray, noteIndex);
        if(nextNoteIndex < playbackNoteArray.length)
        {
            var nextNote = playbackNoteArray[nextNoteIndex];
            var millisecondsPerTick = 400;
            var relativeDelta = nextNote.StartTimeTicks - currentNote.StartTimeTicks;
            var delta = relativeDelta*millisecondsPerTick;

            c_this.NoteIndex = nextNoteIndex;
            c_this.PendingTimeout = setTimeout(c_this.OnPlayAllNotes, delta)
        }
        else
        {
            c_this.StopPlayingNotes();
        }
    }

    PlayNotes(noteArray)
    {
        c_this.NoteIndex = 0;
        c_this.StopPlayingNotes();
        if(noteArray.length > 0)
        {
            c_this.PlaybackNoteArray = noteArray

            c_this.OnPlayAllNotes();
        }
        c_this.Playing = true;
    }

    StopPlayingNotes()
    {
        c_this.Playing = false;
        clearTimeout(c_this.PendingTimeout);

    }

    CreatePreviewNote()
    {
        var startTicks = c_this.View.ConvertXIndexToTicks(c_this.CursorPosition.x);
        var pitch = c_this.View.ConvertYIndexToPitch(c_this.CursorPosition.y);
        var defaultNoteDuration = 4;

        var previewNote = new Note(startTicks, pitch, defaultNoteDuration, true);

        return previewNote;
    }

    CreateGridPreview()
    {
        console.log("Create grid");
        c_this.GridPreviewList.push([]);

    }

    OnHoverBegin(event)
    {
        if(!c_this.Hovering)
        {
            c_this.Hovering = true;
            if(c_this.EditorMode === editModeEnumeration.EDIT)
            {
                var previewNote = c_this.CreatePreviewNote();
                c_this.Model.AddNote(previewNote);
            }
        }

        c_this.RenderMainGridBox()
    }

    OnHoverEnd(event)
    {
        if(c_this.Hovering)
        {
            c_this.Hovering = false;
            c_this.ModifySelectedNotes(function(note)
            {
                note.IsSelected = false;
                if(note.SelectedPitchAndTicks != null)
                {
                    note.ResetPosition();
                }
                else
                {
                    c_this.Model.DeleteNote(note);
                }
            });
        }

        c_this.RenderMainGridBox()
    }

    OnButtonPress(event)
    {
        //Play

    }

    ///Update the cursor position, move all selected notes
    OnMouseMove(cursorPosition)
    {
        if(c_this.LastCursorPosition != c_this.CursorPosition)
        {
            c_this.LastCursorPosition = c_this.CursorPosition;
        }

        c_this.CursorPosition = cursorPosition;

        //If there are selected notes, move them
        var selectCount = c_this.CountSelectedNotes();

        //If a selection rectangle is being drawn, begin selecting notes caught in the rectangle
        if(c_this.SelectingGroup)
        {
            c_this.View.RenderSelectRectangle(c_this.SelectorPosition, c_this.CursorPosition);
            var selectRectangle =
            {
                x1: Math.min(c_this.SelectorPosition.x, c_this.CursorPosition.x),
                y1: Math.min(c_this.SelectorPosition.y, c_this.CursorPosition.y),
                x2: Math.max(c_this.SelectorPosition.x, c_this.CursorPosition.x),
                y2: Math.max(c_this.SelectorPosition.y, c_this.CursorPosition.y)
            };

            c_this.DoActionOnAllNotes( function(note)
            {
                var noteRectangle = c_this.GetNoteRectangle(note);
                var noteIsCaptured = c_this.DoesRectangle1CoverRectangle2(selectRectangle, noteRectangle);

                if(noteIsCaptured)
                {
                    note.IsSelected = true;
                }
                else
                {
                    note.IsSelected = false;
                }
            });

            c_this.RenderMainGridBox()
        }

        //If no selection rectangle is being drawn,
        else if(selectCount > 0)
        {
            var x_offset = c_this.View.ConvertXIndexToTicks(c_this.CursorPosition.x) - c_this.View.ConvertXIndexToTicks(c_this.LastCursorPosition.x);
            var y_offset = c_this.View.ConvertYIndexToPitch(c_this.CursorPosition.y) - c_this.View.ConvertYIndexToPitch(c_this.LastCursorPosition.y);

            //Todo: move notes relative to start position
            c_this.ModifySelectedNotes(function(note){note.Move(x_offset, y_offset);});
            c_this.RenderMainGridBox()
        }

        else
        {

        }
    }

    OnMouseClickDown(event)
    {
        if(c_this.EditorMode == editModeEnumeration.SELECT)
        {
            var selectCount = c_this.CountSelectedNotes();
            var score = c_this.Model.Score;
            var clickedNoteIndex = c_this.GetNoteIfClicked();

            //If a note is clicked, play it
            if((0 <= clickedNoteIndex) && (clickedNoteIndex < score.length))
            {
                var clickedNote = score[clickedNoteIndex];
                console.log(clickedNoteIndex);
                c_this.PlayChord(score, clickedNoteIndex)
            }

            //If there are no selected notes, create a select rectangle
            else if(selectCount == 0)
            {
                c_this.SelectingGroup = true;

                c_this.SelectorPosition = c_this.CursorPosition;

                c_this.View.RenderSelectRectangle(c_this.SelectorPosition, c_this.CursorPosition);
            }
        }
    }

    ///Unselect all selected notes to anchor them
    OnMouseClickUp(event)
    {
        c_this.StopPlayingNotes();
        if(c_this.SelectingGroup === true)
        {
            c_this.View.DeleteSelectRectangle();
            c_this.SelectingGroup = false;
            console.log("Rectangle gone")
        }

        else
        {
            var playbackBuffer = []

            c_this.ModifySelectedNotes(function(note)
            {
                note.IsSelected = false;
                playbackBuffer.push(note);
            });

            c_this.PlayNotes(playbackBuffer);
        }

        if(c_this.EditorMode != editModeEnumeration.SELECT)
        {
            var previewNote = c_this.CreatePreviewNote();

            c_this.Model.AddNote(previewNote);
        }

        c_this.RenderMainGridBox();
    }

    OnMouseScroll(event)
    {
        var ctrl = event.ctrlKey;
        var alt = event.altKey;
        var shift = event.shiftKey;
        var scrollUp = (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0);

        //Change horizontal scale
        if(ctrl)
        {
            event.preventDefault();

            var shouldScroll = false;
            var selectCount = c_this.CountSelectedNotes();

            c_this.DoActionOnAllNotes(function(note)
            {
                if((!note.IsSelected && (selectCount <= 1)) || (note.IsSelected  && (selectCount > 1)))
                {
                    var firstNotePosition = c_this.Model.Score[0].StartTimeTicks;

                    var noteOffset =  (note.StartTimeTicks - firstNotePosition);
                    console.log(noteOffset);

                    if(scrollUp)
                    {
                        shouldScroll = note.Duration <= 8;
                    }
                    else
                    {
                        shouldScroll = (note.Duration > 1)  && ((noteOffset % 2) == 0);;
                    }
                    if(!shouldScroll)
                    {
                        console.log("Dont scroll")
                        return;
                    }
                }
            });

            if(shouldScroll)
            {
                c_this.DoActionOnAllNotes(function(note)
                {
                    var firstNotePosition = c_this.Model.Score[0].StartTimeTicks;
                    var noteOffset =  (note.StartTimeTicks - firstNotePosition);

                    if((!note.IsSelected && (selectCount <= 1)) || (note.IsSelected  && (selectCount > 1)))
                    {
                        var newDuration;
                        var newPosition;

                        if(scrollUp)
                        {
                            shouldScroll = note.Duration <= 16;
                            newDuration = note.Duration*2;
                            newPosition = firstNotePosition + noteOffset*2;
                        }
                        else
                        {
                            shouldScroll = note.Duration > 1;
                            newDuration = note.Duration/2;
                            newPosition = firstNotePosition + noteOffset/2;
                        }

                        note.Duration = newDuration;
                        note.StartTimeTicks = newPosition;

                    }
                });
                c_this.RenderMainGridBox();
            }
        }
        else if(shift)
        {
            event.preventDefault();
                // scroll down
                console.log("shift scroll");
            }
            else {

            }
        }

    OnRadioButtonPress(eventData)
    {
        console.log(eventData)
    }

    GetNoteRectangle(note)
    {
        var x1Value = c_this.View.ConvertTicksToXIndex(note.StartTimeTicks);
        var y1Value = c_this.View.ConvertPitchToYIndex(note.Pitch);
        var gridSnap = c_this.View.gridSnap;

        var noteRectangle = {
            x1: x1Value,
            y1: y1Value,
            x2: x1Value+note.Duration*gridSnap,
            y2: y1Value+1*gridSnap
        };

        return noteRectangle;
    }

    GetNoteIfClicked()
    {
        //Get the index of a clicked note. Return -1 if no notes were clicked
        var clickedNoteIndex = -1;

        var cursorPosition = c_this.CursorPosition;
        var cursorRectangle =
        {
            x1: cursorPosition.x,
            y1: cursorPosition.y,
            x2: cursorPosition.x,
            y2: cursorPosition.y,
        }

        var noteIndex = 0;
        c_this.DoActionOnAllNotes( function(note)
        {
            var noteRectangle = c_this.GetNoteRectangle(note);
            var noteWasClicked = c_this.DoesRectangle1CoverRectangle2(noteRectangle, cursorRectangle);

            if(noteWasClicked)
            {
                clickedNoteIndex = noteIndex;
                console.log("CLICK")
            }
            noteIndex++;
        });

        return clickedNoteIndex;
    }


    DoesRectangle1CoverRectangle2(rectangle1, rectangle2)
    {
        var xCovered = (rectangle1.x1 <= rectangle2.x1) && (rectangle1.x2 >= rectangle2.x2) ;
        var yCovered = (rectangle1.y1 <= rectangle2.y1) && (rectangle1.y2 >= rectangle2.y2) ;
        var result = xCovered && yCovered;
            console.log(rectangle1, rectangle2, result);
        return result;
    }



        	/* analysis suite
        function DrawBeats(meter)
        {
        	var gridWidth = parseInt($(maingrid).css('width'),10)/snapX;
        	var divisions = gridWidth/meter;
        	var currentLeftOffset = 0;
        	for(var i=0;i<divisions;i++)
        	{
            currentLeftOffset += meter*snapX;
            var node = document.createElement('div');
            $(maingrid).append(node);

            $(node).css({'position':'absolute','top':0,'left':currentLeftOffset, 'height':'100%', 'width':1,'background':'black'});
        	}
        }

        function getNoteArray()
        {
        	var noteArray = [];

        	$(".node").each(function()
        	{
            var pitch = 72-(parseInt($(this).css('top'),10)/snapY);
            var delta = parseInt($(this).css('left'),10)/snapX;
            var duration = parseInt($(this).css('width'),10)/snapX;
            var entry = {'pitch':pitch,'delta':delta,'duration':duration};
            noteArray.push(entry);
            //console.log(entry);
        	});
        	return noteArray;
        }

        function getIntervalArray()
        {
        	var noteArray = getNoteArray();
        	var temporalDict = {};
        	for(var i =0; i<noteArray.length;i++)
        	{
            noteEntry = noteArray[i];
            delta = noteEntry.delta;
            if(!temporalDict[delta])
            	temporalDict[delta] = [];
            temporalDict[delta].push(noteEntry);
        	}
        	temporaryDict = {};
        	for(var delta in temporalDict)
        	{
            chunk = temporalDict[delta];
            delta = parseInt(delta,10);
            for(var j=0; j<chunk.length;j++)
            {
            	//for each note in the chunk at this moment
            	note = chunk[j];
            	duration = note.duration;

            	while(duration-- > 0)
            	{

                tempDelta = duration+delta;
                if(temporalDict[tempDelta])
                {
                	if(!temporaryDict[tempDelta])
                    temporaryDict[tempDelta] = [];
                	temporaryDict[tempDelta].push(note);
                }
            	}


            }
        	}
        	//merged dict of temporal events
        	//console.log('temporary: '+JSON.stringify(temporaryDict));
        	//console.log('main: '+JSON.stringify(temporalDict));

        	for(var delta in temporaryDict)
        	{
            temporaryNoteChunk = temporaryDict[delta];
            temporalNoteChunk = temporalDict[delta];

            if(!temporalDict[delta])
            	temporalDict[delta] = temporaryNoteChunk;
            else
            {
            	for(var i=0;i<temporaryNoteChunk.length;i++)
            	{
                var noteToAdd = temporaryNoteChunk[i]
                var pitchAlreadyPresent = false;
                for(var j=0;j<temporalNoteChunk.length;j++)
                {

                	if(temporalNoteChunk[j].pitch == noteToAdd.pitch)
                    pitchAlreadyPresent = true;
                }
                if(!pitchAlreadyPresent)
                {
                	temporalDict[delta].push(noteToAdd);

                }
            	}
            }
        	}
        	var intervals = []
        	console.log(JSON.stringify(temporalDict));
        	for(var delta in temporalDict)
        	{
            //If more than 2 entries, just ignore it.. use outer eventually
            if(temporalDict[delta].length == 2)
            	intervals.push(Math.abs(temporalDict[delta][0].pitch - temporalDict[delta][1].pitch));

        	}
        	console.log(intervals);
        	return intervals;

        }
        function CheckMelody(track)
        {

        }

        function CheckCounterpoint()
        {
        	//Fux's fundamental rules:
        	//Any interval -> Perfect: contrary/oblique

        	//Species:
        	//Strong beat: consonance
        	//1st: 1:1 notes
        	//2nd
        	//3rd
        	//4th

        	//General:
        	//Balance leaps of a fifth or more by going down afterwards
        	//Don't move stepwise into a leap in the same direction
        	//

        	//getNoteArray();
        	var perfectIntervals = new Set([0, 7, 12]); //unison, fifth, octave
        	var imperfectIntervals = new Set([3,4,8,9]); //m3,M3,m6,M6
        	var dissonantIntervals = new Set([1,2,5,6,10,11]);
        	var intervals = getIntervalArray();
        	var directions = getDirectionsArray();
        	var beats = getBeatsArray();
        	var previousStrongBeatInterval = null;
        	for(var i=0; i<intervals.length-1;i++)
        	{
            var oppositeMotion = (directions[i] == 'contrary') || (directions[i] == 'oblique');
            var directMotionToPerfectInterval = (perfectIntervals.has(intervals[i+1]) && !oppositeMotion);
            var parallelPerfectIntervals = perfectIntervals.has(intervals[i+1]) && perfectIntervals.has(intervals[i])

            if(beats[i] == 'strong')
            {
            	var directConsonantBeats = perfectIntervals.has(previousStrongBeatInterval) && perfectIntervals.has(intervals[i]);
            	var strongbeatDissonance = dissonantIntervals.has(intervals[i]);
            	previousStrongBeatInterval = intervals[i];
            }

            if(directMotionToPerfectInterval || strongbeatDissonance || parallelPerfectIntervals)
            {
            	//bad
            }

        	}

        }
        DrawBeats(4);*/

}
