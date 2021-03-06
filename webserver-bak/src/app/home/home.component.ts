import {
  Component, OnInit, Inject, ElementRef, ViewChild
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { Http } from '@angular/http';
import { ChartsModule } from 'ng2-charts';
import { AppState } from '../app.service';
import { UserInput } from './userinput.interface';
declare var saveAs: any;

@Component({
  selector: 'home',
  providers: [],
  styleUrls: [ './home.component.css' ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  // public baseAPI = 'http://ijah.apps.cs.ipb.ac.id/api/';
  // public baseAPI = 'http://ijah.agri.web.id/api/';
  public baseAPI = 'http://localhost/ijah-api/';

  public userinput: UserInput;

  // count number of input rows
  public nPlaInputHolders = 0;
  public nComInputHolders = 0;
  public nProInputHolders = 0;
  public nDisInputHolders = 0;
  public plaInputHolders = [];
  public comInputHolders = [];
  public proInputHolders = [];
  public disInputHolders = [];
  public plaInputHoldersDisabled = [];
  public comInputHoldersDisabled = [];
  public proInputHoldersDisabled = [];
  public disInputHoldersDisabled = [];

  // active variable
  public activeTanaman = true;
  public activeCompound = true;
  public activeProtein = true;
  public activeDisease = true;

  // Search data for auto completion, search while filling
  public plantSearch = [];
  public compoundSearch = [];
  public proteinSearch = [];
  public diseaseSearch = [];

  // Total number of items in each set
  public nPlantInDB;
  public nCompoundInDB;
  public nProteinInDB;
  public nDiseaseInDB;

  // Items in summary output
  public totScore;

  public plaComScore;
  public comProScore;
  public proDisScore;

  public plaSum;
  public comSum;
  public proSum;
  public disSum;

  public plaMark;
  public comMark;
  public proMark;
  public disMark;

  // Items selected by users
  public selectedPlants = [];
  public selectedCompounds = [];
  public selectedProteins = [];
  public selectedDiseases = [];

  // Used in connectivity text output
  public plaVScomTxtOutput;
  public comVSproTxtOutput;
  public proVSdisTxtOutput;
  public comVSplaTxtOutput;
  public proVScomTxtOutput;
  public disVSproTxtOutput;
  public plaVScomSwapped = false;
  public comVSproSwapped = false;
  public proVSdisSwapped = false;

  // Used in metadata text output
  public plaMetaTxtOutput;
  public comMetaTxtOutput;
  public proMetaTxtOutput;
  public disMetaTxtOutput;

  // Used in summary text output
  public summaryTxtOutput;
  public summaryTxtOutput2;
  public summaryTxtOutput3;

  public filterThreshold = 0.0;

  // Misc.
  // TODO explain the usage
  public show = false; // whether to show the output in home.page
  public showGraph = false;
  public click = false; // whether searchAndPredictButton was clicked
  public elapsedTime = 0;
  public mode = 'unknown';
  public inputType = 'unknown';
  public useCases = [
    { value: 'default', display: '-- Select Usage Example --' },
    { value: 'useCase1', display: 'Drug-side Input Only' },
    { value: 'useCase2', display: 'Target-side Input Only' },
    { value: 'useCase3', display: 'Both Drug-side and Target-side Input' }
  ];

  public dataLocal = [];
  public typeaheadNoResults: boolean = false;

  public noResultPlant = false;
  public noResultCompound = false;
  public noResultProtein = false;
  public noResultDisease = false;

  // Pie chart for summary
  public pieChartLabels: string[] = ['Known by Experiment',
  'Known by Prediction', 'Unknown', 'Undefined'];
  public pieChartData: number[] = [];
  public pieChartType: string = 'pie';
  public pieChartOptions: any = {
    legend: {position: 'bottom'},
  };

  // API URL addresses
  private interactionQueryAPI;
  private metaQueryAPI;
  private predictAPI;

  // List of sources in the form of a string, each separated by an underscore _
  private comProConnExperimentSrcs = ['drugbank.ca'];
  private comProConnPredictionSrcs = ['rndly', 'blmnii', 'kronrls'];

  //
  private plaVScom_ = []; // tslint:disable-line
  private comVSpro_ = []; // tslint:disable-line
  private proVSdis_ = []; // tslint:disable-line
  private plaSet_ = []; // tslint:disable-line
  private comSet_ = []; // tslint:disable-line
  private proSet_ = []; // tslint:disable-line
  private disSet_ = []; // tslint:disable-line

  private pTanaman = false;
  private pProtein = false;
  private pCompound = false;
  private pDisease = false;

  private data: any;

  private stateCtrl: FormControl = new FormControl();

  private myForm: FormGroup = new FormGroup({
    state: this.stateCtrl
  });

  //////////////////////////////////////////////////////////////////////////////
  public constructor(public appState: AppState, private http: Http) {
    this.interactionQueryAPI = this.baseAPI + 'connectivity.php';
    this.metaQueryAPI = this.baseAPI + 'metadata.php';
    this.predictAPI = this.baseAPI + 'predict.php';

    this.plaInputHolders = [{ index: this.nPlaInputHolders, value : ''}];
    this.comInputHolders = [{ index: this.nComInputHolders, value : ''}];
    this.proInputHolders = [{ index: this.nProInputHolders, value : ''}];
    this.disInputHolders = [{ index: this.nDisInputHolders, value : ''}];

    this.http.get(this.baseAPI + 'total.php').map((res) => res.json())
      .subscribe((data) => {
        this.nPlantInDB = data[0]['plant_total'];
        this.nCompoundInDB = data[0]['compound_total'];
        this.nProteinInDB = data[0]['protein_total'];
        this.nDiseaseInDB = data[0]['disease_total'];
      });

    // Query for metadata for _text_ _completion_ //////////////////////////////
    let plaPostMsg = ['PLA_ALL_ROWS'];
    let plaPostMsgJSON = this.makeJSONFormat(plaPostMsg, 'id');
    this.http.post(this.metaQueryAPI, plaPostMsgJSON).map((res) => res.json())
      .subscribe((data) => {
        for (let i = 0; i < data.length; i++) { // tslint:disable-line
          let valid = [];
          if (data[i]['pla_name']) {
            valid.push(data[i]['pla_name']);
          }
          if (data[i]['pla_idr_name']) {
            valid.push(data[i]['pla_idr_name']);
          }

          let str = '';
          for (let j = 0; j < valid.length; j++) {
            str = str + valid[j];
            if (j < valid.length - 1) {
              str = str + ' | ';
            }
          }
          data[i]['search'] = str;
        }
        this.plantSearch = data;
      });

    let proPostMsg = ['PRO_ALL_ROWS'];
    let proPostMsgJSON = this.makeJSONFormat(proPostMsg, 'id');
    this.http.post(this.metaQueryAPI, proPostMsgJSON).map((res) => res.json())
      .subscribe((data) => {
        for (let i = 0; i < data.length; i++) { // tslint:disable-line
          let temp = data[i]['pro_uniprot_id'] + ' | ' + data[i]['pro_uniprot_abbrv'] + ' | '
           + data[i]['pro_name'];
          data[i]['search'] = temp;
        }
        this.proteinSearch = data;
      });

    let disPostMsg = ['DIS_ALL_ROWS'];
    let disPostMsgJSON = this.makeJSONFormat(disPostMsg, 'id');
    this.http.post(this.metaQueryAPI, disPostMsgJSON).map((res) => res.json())
      .subscribe((data) => {
        for (let i = 0; i < data.length; i++) { // tslint:disable-line
          let temp = data[i]['dis_omim_id'] + ' | ' + data[i]['dis_name'];
          data[i]['search'] = temp;
        }
        this.diseaseSearch = data;
      });

    let comPostMsg = ['COM_ALL_ROWS'];
    let comPostMsgJSON = this.makeJSONFormat(comPostMsg, 'id');
    this.http.post(this.metaQueryAPI, comPostMsgJSON).map((res) => res.json())
      .subscribe((data) => {
        for (let i = 0; i < data.length; i++) { // tslint:disable-line
          let valid = [];
          if (data[i]['com_cas_id']) {
            valid.push(data[i]['com_cas_id']);
          }
          if (data[i]['com_pubchem_name']) {
            valid.push(data[i]['com_pubchem_name']);
          }
          if (data[i]['com_iupac_name']) {
            valid.push(data[i]['com_iupac_name']);
          }

          let str = '';
          for (let j = 0; j < valid.length; j++) {
            str = str + valid[j];
            if (j < valid.length - 1) {
              str = str + ' | ';
            }
          }
          data[i]['search'] = str;
        }
        this.compoundSearch = data;
      });
  }

  public ngOnInit() {
    this.userinput = {
      useCase: 'default'
    };
  }

  public changeTypeaheadNoResults(e: boolean, id): void {
    this.typeaheadNoResults = e;

    if (id === 1) {
      this.noResultPlant = e;
    } else if (id === 2) {
      this.noResultCompound = e;
    } else if (id === 3) {
      this.noResultProtein = e;
    } else if (id === 4) {
      this.noResultDisease = e;
    }
  }

  // INPUT HANDLING METHODS ////////////////////////////////////////////////////
  public selectPlant(e: any, index, ab): void {
    if (index !== this.nPlaInputHolders) {
      this.selectedPlants.push({ index: this.nPlaInputHolders, value : e.item.pla_id});
      this.plaInputHoldersDisabled[index] = true;
    }
  }

  public selectCompound(e: any, index): void {
    if (index !== this.nComInputHolders) {
      this.selectedCompounds.push({ index: this.nComInputHolders, value : e.item.com_id});
      this.comInputHoldersDisabled[index] = true;
    }
  }

  public selectProtein(e: any, index): void {
    if (index !== this.nProInputHolders) {
      this.selectedProteins.push({ index: this.nProInputHolders, value : e.item.pro_id});
      this.proInputHoldersDisabled[index] = true;
    }
  }

  public selectDisease(e: any, index): void {
    if (index !== this.nDisInputHolders) {
      this.selectedDiseases.push({ index: this.nDisInputHolders, value : e.item.dis_id});
      this.disInputHoldersDisabled[index] = true;
    }
  }

  public focusPlant(index: number) {
    let MAX_INPUT_PLANTS = 5;
    this.activeCompound = false;
    if (index === this.nPlaInputHolders) {
      if (this.nPlaInputHolders + 1 < MAX_INPUT_PLANTS) {
        this.nPlaInputHolders++;
        this.plaInputHolders.push({ index: this.nPlaInputHolders, value : ''});
      }
    }
  }

  public focusCompound(index: number) {
    let MAX_INPUT_COMPOUNDS = 5;
    this.activeTanaman = false;
    if (index === this.nComInputHolders) {
      if (this.nComInputHolders + 1 < MAX_INPUT_COMPOUNDS) {
        this.nComInputHolders++;
        this.comInputHolders.push({ index: this.nComInputHolders, value : ''});
      }
    }
  }

  public focusProtein(index: number) {
    let MAX_INPUT_PROTEINS = 5;
    this.activeDisease = false;
    if (index === this.nProInputHolders) {
      if (this.nProInputHolders + 1 < MAX_INPUT_PROTEINS) {
        this.nProInputHolders++;
        this.proInputHolders.push({ index: this.nProInputHolders, value : ''});
      }
    }
  }

  public focusDisease(index: number) {
    let MAX_INPUT_DISEASES = 5;
    this.activeProtein = false;
    if (index === this.nDisInputHolders) {
      if (this.nDisInputHolders + 1 < MAX_INPUT_DISEASES) {
        this.nDisInputHolders++;
        this.disInputHolders.push({ index: this.nDisInputHolders, value : ''});
      }
    }
  }

  public deletePlant(index) {
    // console.log(index);
    this.selectedPlants.splice(index, 1);
    this.plaInputHolders.splice(index, 1);
  }

  public deleteCompound(index) {
    // console.log(index);
    this.selectedCompounds.splice(index, 1);
    this.comInputHolders.splice(index, 1);
  }

  public deleteProtein(index) {
    // console.log(index);
    this.selectedProteins.splice(index, 1);
    this.proInputHolders.splice(index, 1);
  }

  public deleteDisease(index) {
    // console.log(index);
    this.selectedDiseases.splice(index, 1);
    this.disInputHolders.splice(index, 1);
  }

  // SEARCH+PREDICT METHODS ////////////////////////////////////////////////////
  public searchAndPredictButtonCallback() {
    if (this.selectedPlants.length === 0 && this.selectedCompounds.length === 0 &&
        this.selectedProteins.length === 0 && this.selectedDiseases.length === 0) {
      this.reset();
      return;
    }

    ////////////////////////////////////////////////////////////////////////////
    this.click = true;

    let showPlant = false;
    let showCompound = false;
    let showProtein = false;
    let showDisease = false;

    if (this.plaInputHolders.length > 1 && this.disInputHolders.length <= 1
       && this.proInputHolders.length <= 1) {
      this.searchFromDrugSide(this.selectedPlants);
      this.mode = 'search_only';
      this.inputType = 'plant';
      showPlant = true;

    } else if (this.comInputHolders.length > 1 && this.proInputHolders.length <= 1
       && this.disInputHolders.length <= 1) {
      this.searchFromDrugSide(this.selectedCompounds);
      this.mode = 'search_only';
      this.inputType = 'compound';
      showCompound = true;

    } else if (this.proInputHolders.length > 1 && this.plaInputHolders.length <= 1
       && this.comInputHolders.length <= 1) {
      this.searchFromTargetSide(this.selectedProteins);
      this.mode = 'search_only';
      this.inputType = 'protein';
      showProtein = true;

    } else if (this.disInputHolders.length > 1 && this.plaInputHolders.length <= 1
       && this.comInputHolders.length <= 1) {
      this.mode = 'search_only';
      this.inputType = 'disease';
      this.searchFromTargetSide(this.selectedDiseases);
      showDisease = true;

    // Starting next line: Use case 1: both sides are specified /////////////////////////////////
    } else if (this.plaInputHolders.length > 1
       && this.proInputHolders.length > 1) {
      this.mode = 'search_and_predict';
      this.inputType = 'plant+protein';
      this.searchAndPredict(this.selectedPlants, this.selectedProteins);

    } else if (this.plaInputHolders.length > 1 && this.disInputHolders.length > 1) {
      this.mode = 'search_and_predict';
      this.inputType = 'plant+disease';
      this.searchAndPredict(this.selectedPlants, this.selectedDiseases);

    } else if (this.comInputHolders.length > 1 && this.proInputHolders.length > 1) {
      this.mode = 'search_and_predict';
      this.inputType = 'compound+protein';
      this.searchAndPredict(this.selectedCompounds, this.selectedProteins);

    } else if (this.comInputHolders.length > 1 && this.disInputHolders.length > 1) {
      this.mode = 'search_and_predict';
      this.inputType = 'compound+disease';
      this.searchAndPredict(this.selectedCompounds, this.selectedDiseases);
    }

    ////////////////////////////////////////////////////////////////////////////
    let inter = setInterval(() => {
      if (showPlant && !showProtein && !showDisease) {
        if (this.pTanaman) {
          localStorage.setItem('data', JSON.stringify(this.dataLocal));
          this.show = true;
          this.click = false;
          clearInterval(inter);
        }
      } else if (showCompound && !showProtein && !showDisease) {
        if (this.pCompound) {
          localStorage.setItem('data', JSON.stringify(this.dataLocal));
          this.show = true;
          this.click = false;
          clearInterval(inter);
        }
      } else if (showProtein && !showPlant && !showCompound) {
        if (this.pProtein) {
          localStorage.setItem('data', JSON.stringify(this.dataLocal));
          this.show = true;
          this.click = false;
          clearInterval(inter);
        }
      } else if (showDisease && !showPlant && !showCompound) {
        if (this.pDisease) {
          localStorage.setItem('data', JSON.stringify(this.dataLocal));
          this.show = true;
          this.click = false;
          clearInterval(inter);
        }
      }
      if (this.show) {
        this.click = false;
      }
    }, 100);
  }

  public predictMore() {
    this.show = false;
    this.searchAndPredictButtonCallback();
  }

  public searchAndPredict(drugSideInput, targetSideInput) {
    console.log('searchAndPredict');
    let t0 = performance.now();

    let dsi = JSON.stringify(drugSideInput);
    let tsi = JSON.stringify(targetSideInput);
    // console.log(dsi);
    // console.log(tsi);

    this.http.post(this.interactionQueryAPI, dsi).map((resp) => resp.json())
    .subscribe((plaVScom) => {
      this.http.post(this.interactionQueryAPI, tsi).map((resp2) => resp2.json())
      .subscribe((proVSdis) => {
        // Ijah also accomodates syntetic compound vs protein.
        // This means that some compounds have no plant, and some some protein have no disease.
        // However, all plants have compounds, and all diseases have proteins
        let comArr = [];
        if (plaVScom.length === 0) {
          for (let i = 0; i < drugSideInput.length; i++) { // tslint:disable-line
            let comId = drugSideInput[i]['value'];
            comArr.push(comId);
          }
        } else {
          for (let i = 0; i < plaVScom.length; i++) { // tslint:disable-line
            let comId = plaVScom[i]['com_id'];
            comArr.push(comId);
          }
        }

        let proArr = [];
        if (proVSdis.length === 0) {
          for (let i = 0; i < targetSideInput.length; i++) { // tslint:disable-line
            let proId = targetSideInput[i]['value'];
            proArr.push(proId);
          }
        } else {
          for (let i = 0; i < proVSdis.length; i++) { // tslint:disable-line
            let proId = proVSdis[i]['pro_id'];
            proArr.push(proId);
          }
        }

        let comVSproList = [];
        for (let i = 0; i < comArr.length; i++) { // tslint:disable-line
          for (let j = 0; j < proVSdis.length; j++) {
            let comId = '"' + comArr[i] + '"';
            let proId = '"' + proArr[j] + '"';
            let comVSpro = '{' + '"comId":' + comId + ', ' + '"proId":' + proId + '}';
            comVSproList.push(comVSpro);
          }
        }

        // make unique
        comVSproList = comVSproList.filter((v, i, a) => a.indexOf(v) === i);

        // make it JSON-format
        let comVSproStr = '';
        for (let k = 0; k < comVSproList.length; k++) {
          comVSproStr += comVSproList[k];
          if (k < comVSproList.length - 1) {
            comVSproStr = comVSproStr + ', ';
          }
        }
        comVSproStr = '[' + comVSproStr + ']';

        this.http.post(this.interactionQueryAPI, comVSproStr).map((resp3) => resp3.json())
        .subscribe((comVSpro) => {
          let comToPredictArr = [];
          let proToPredictArr = [];
          let idxToPredictArr = [];
          for (let i = 0; i < comVSpro.length; i++) {
            let src = comVSpro[i]['source'];
            if (src === 'null') {
              comToPredictArr.push(comVSpro[i]['com_id']);
              proToPredictArr.push(comVSpro[i]['pro_id']);
              idxToPredictArr.push(i);
            }
          }
          let comVSproToPredictStr = '';
          for (let i = 0; i < comToPredictArr.length; i++) {
            let comId = '"' + comToPredictArr[i] + '"';
            let proId = '"' + proToPredictArr[i] + '"';
            comVSproToPredictStr += '{' + '"comId":' + comId + ', ' + '"proId":' + proId + '}';
            if (i < comToPredictArr.length - 1) {
              comVSproToPredictStr += ', ';
            }
          }
          comVSproToPredictStr = '[' + comVSproToPredictStr + ']';
          // console.log(comVSproToPredictStr);

          this.http.post(this.predictAPI, comVSproToPredictStr).map((resp4) => resp4.json())
          .subscribe((hasWaitedForMsg) => {
            let hasWaitedFor = parseFloat( hasWaitedForMsg[0]['has_waited_for'] );
            console.log('hasWaitedFor= ' + hasWaitedFor.toString());

            this.http.post(this.interactionQueryAPI, comVSproToPredictStr).map((resp5) =>
            resp5.json())
              .subscribe((comVSproPred) => {
                let comVSproMerged = comVSpro;
                for (let i = 0; i < comVSproPred.length; i++) {
                  let idx = idxToPredictArr[i];
                  comVSproMerged[idx]['com_id'] = comVSproPred[i]['com_id'];
                  comVSproMerged[idx]['pro_id'] = comVSproPred[i]['pro_id'];
                  comVSproMerged[idx]['weight'] = comVSproPred[i]['weight'];
                  comVSproMerged[idx]['source'] = comVSproPred[i]['source'];
                  comVSproMerged[idx]['timestamp'] = comVSproPred[i]['timestamp'];
                }
                // Get unique items
                let plaSet = this.getSet(plaVScom, 'pla_id');
                let comSet = this.getSet(comVSproMerged, 'com_id');
                let proSet = this.getSet(comVSproMerged, 'pro_id');
                let disSet = this.getSet(proVSdis, 'dis_id');

                let t1 = performance.now();
                this.elapsedTime += (t1 - t0);

                this.makeOutput(plaSet, comSet, proSet, disSet,
                                plaVScom, comVSproMerged, proVSdis);
                this.storeMetaAndConnectivity(plaSet, comSet, proSet, disSet,
                                              plaVScom, comVSproMerged, proVSdis);
            });
          });
        });
      });
    });
  }

  // UTILITY METHODS ///////////////////////////////////////////////////////////
  public storeMetaAndConnectivity(plaSet, comSet, proSet, disSet, plaVScom, comVSpro, proVSdis) {
    this.plaSet_ = plaSet;
    this.comSet_ = comSet;
    this.proSet_ = proSet;
    this.disSet_ = disSet;
    this.plaVScom_ = plaVScom;
    this.comVSpro_ = comVSpro;
    this.proVSdis_ = proVSdis;
  }

  public filterOnComProConnWeight(threshold, plaVScom, comVSpro, proVSdis) {
    let comVSproF = [];
    for (let i = 0; i < comVSpro.length; i++) { // tslint:disable-line
      let source = comVSpro['source'];
      if (source === 'null') {
        continue;
      }

      let w = parseFloat(comVSpro[i]['weight']);
      if (w < threshold) {
        continue;
      }

      comVSproF.push(comVSpro[i]);
    }

    let comSet = this.getSet(comVSproF, 'com_id');
    let proSet = this.getSet(comVSproF, 'pro_id');

    // Remake the conn
    let plaVsComF = [];
    for (let i = 0; i < plaVScom.length; i++) { // tslint:disable-line
      let com = plaVScom[i]['com_id'];
      if (comSet.indexOf(com) !== -1) {
        plaVsComF.push(plaVScom[i]);
      }
    }

    let proVSdisF = [];
    for (let i = 0; i < proVSdis.length; i++) { // tslint:disable-line
      let pro = proVSdis[i]['pro_id'];
      if (proSet.indexOf(pro) !== -1) {
        proVSdisF.push(proVSdis[i]);
      }
    }

    return [plaVsComF, comVSproF, proVSdisF];
  }

  public find(k, arr) {
    let idx = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === k) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  public groupBy(srcT, destT, iconn) {
    let srcSet = new Array();
    let connSet = new Array();
    for (let i = 0; i < iconn.length; i++) { // tslint:disable-line
      let srcV = iconn[i][srcT + '_id'];
      let destV = iconn[i][destT + '_id'];

      let idx = this.find(srcV, srcSet);
      if (idx === -1) {
        idx = srcSet.length;
        srcSet.push(srcV);
        connSet.push( new Array() );
      }

      let w = iconn[i]['weight'];
      let s = iconn[i]['source'];
      let str = s + '$' + w + '$' + srcV + '$' + destV;
      connSet[idx].push(str);
    }

    for (let i = 0; i < connSet.length; i++) {
      connSet[i] = connSet[i].sort();
    }

    return connSet;
  }

  public toggleConnectivitySwap(type) {
    if (type === 'plaVScom') {
      this.plaVScomSwapped = !this.plaVScomSwapped;
    }
    if (type === 'comVSpro') {
      this.comVSproSwapped = !this.comVSproSwapped;
    }
    if (type === 'proVSdis') {
      this.proVSdisSwapped = !this.proVSdisSwapped;
    }
  }

  public filter() {
    this.showGraph = false;

    let delta = 0.2;
    this.filterThreshold += delta;
    if (this.filterThreshold > 1.0) {
      this.filterThreshold = 0.0;
    }
    this.filterThreshold = parseFloat( this.filterThreshold.toFixed(1) );

    let filtered = this.filterOnComProConnWeight(this.filterThreshold,
                                                 this.plaVScom_, this.comVSpro_, this.proVSdis_);
    let plaVScomF = filtered[0];
    let comVSproF = filtered[1];
    let proVSdisF = filtered[2];

    let plaSetF = this.getSet(plaVScomF, 'pla_id');
    let comSetF = this.getSet(comVSproF, 'com_id');
    let proSetF = this.getSet(comVSproF, 'pro_id');
    let disSetF = this.getSet(proVSdisF, 'dis_id');

    this.makeOutput(plaSetF, comSetF, proSetF, disSetF,
                    plaVScomF, comVSproF, proVSdisF);
  }

  public getConnectivityScore(connectivity) {
    let score = 0.0;
    for (let i = 0; i < connectivity.length; i++) { // tslint:disable-line
      let src = connectivity[i]['source'];
      if (src !== 'null') {
        let wStr = connectivity[i]['weight'];
        score += parseFloat(wStr);
      }
    }
    return score;
  }

  public getInputMark(type) {
    let mark = '';
    if (this.inputType.indexOf(type) !== -1) {
      mark = ' (as inputs)';
    }
    console.log(mark);
    return mark;
  }

  public makeJSONFormat(arr, key) {
    let str = '';
    for (let j = 0; j < arr.length; j++ ) {
      str = str + '{' + '"' + key + '"' + ':' + '"' + arr[j] + '"' + '}';
      if (j < arr.length - 1) {
        str = str + ', ';
      }
    }
    str = '[' + str + ']';
    return str;
  }

  public getSet(interaction, id) {
    let set = [];
    for (let i = 0; i < interaction.length; i++) { // tslint:disable-line
      let item = interaction[i][id];
      if (set.indexOf(item) === -1) {
        set.push(item);
      }
    }
    return set;
  }

  public getPropKeys(type, extra) {
    let keys: string[] = [];
    if (type === 'pla') {
      keys.push('pla_name');
      keys.push('pla_idr_name');
    }
    if (type === 'com') {
      keys.push('com_cas_id');
      keys.push('com_pubchem_name');
      keys.push('com_iupac_name');
      if (extra) {
        keys.push('com_drugbank_id');
        keys.push('com_knapsack_id');
        keys.push('com_kegg_id');
        keys.push('com_pubchem_id');
      }
    }
    if (type === 'pro') {
      keys.push('pro_uniprot_id');
      keys.push('pro_uniprot_abbrv');
      keys.push('pro_name');
      keys.push('pro_pdb_id');
    }
    if (type === 'dis') {
      keys.push('dis_omim_id');
      keys.push('dis_name');
    }
    return keys;
  }

  public getHyperlinkStr(type, seed) {
    let baseUrl = '';
    if (type === 'pla_name') {
      baseUrl = 'https://en.wikipedia.org/wiki/';
    } else if (type === 'pla_idr_name') {
      baseUrl = 'https://id.wikipedia.org/wiki/';
    } else if (type === 'com_knapsack_id') {
      baseUrl = 'http://kanaya.naist.jp/knapsack_jsp/information.jsp?sname=C_ID&word=';
    } else if (type === 'com_drugbank_id') {
      baseUrl = 'https://www.drugbank.ca/drugs/';
    } else if (type === 'com_kegg_id') {
      baseUrl = 'http://www.genome.jp/dbget-bin/www_bget?cpd:';
    } else if (type === 'com_pubchem_name' || type === 'com_pubchem_id') {
      baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/compound/';
    } else if (type === 'pro_uniprot_id' || type === 'pro_uniprot_abbrv') {
      baseUrl = 'http://www.uniprot.org/uniprot/';
    } else if (type === 'pro_pdb_id') {
      baseUrl = 'http://www.rcsb.org/pdb/explore/explore.do?structureId=';
    } else if (type === 'dis_omim_id') {
      baseUrl = 'https://www.omim.org/entry/';
    } else {
      baseUrl = 'unknown';
    }

    let urlStr = '';
    if (baseUrl.indexOf('unknown') === -1 && seed && seed !== '' && seed !== 'null') {
      let sep = 'unknown';
      if (type === 'pro_pdb_id') {
        sep = ', ';
      } else if (type === 'pla_idr_name') {
        sep = '/';
      }

      let seedComps = seed.split(sep);
      for (let i = 0; i < seedComps.length; i++) {
        let s = seedComps[i];
        let url: string = baseUrl + s;

        if (i > 0) {
          urlStr += sep;
        }
        urlStr  += '<a href="' + url + '" target="_blank">' + s + '</a>';
      }
    } else {
      urlStr = seed;
    }

    return urlStr;
  }

  public getProps(id, keys, meta) {
    let prefix = id.substr(0, 3);
    prefix = prefix.toLowerCase() + '_id';

    let idx = -1;
    for (let i = 0; i < meta.length; i++) {
      if (id === meta[i][prefix]) {
        idx = i;
        break;
      }
    }

    let props = [];
    if (idx !== -1) {
      for (let j = 0; j < keys.length; j++) { // tslint:disable-line
        let k = keys[j];
        props.push( meta[idx][k] );
      }
    } else {
      // console.log('ERROR: NOT FOUND');
    }

    return props;
  }

  public getConnHeader(type, indent) {
    let headerArr = new Array();
    headerArr['pla'] = 'LatinName|IndonesianName';
    headerArr['com'] = 'CAS|PubchemName|IUPACName';
    headerArr['pro'] = 'UniprotID|UniprotName|PDBIDs';
    headerArr['dis'] = 'OmimID|OmimName';

    headerArr['pla_vs_com'] = '0) ' + headerArr['pla'] + ':\n' +
                              indent + '[source:#data]' + '\n' +
                              indent + indent + '[weight] ' + headerArr['com'];
    headerArr['com_vs_pro'] = '0) ' + headerArr['com'] + ':\n' +
                              indent + '[source:#data]' + '\n' +
                              indent + indent + '[weight] ' + headerArr['pro'];
    headerArr['pro_vs_dis'] = '0) ' + headerArr['pro'] + ':\n' +
                              indent + '[source:#data]' + '\n' +
                              indent + indent + '[weight] ' + headerArr['dis'];

    headerArr['com_vs_pla'] = '0) ' + headerArr['com'] + ':\n' +
                              indent + '[source:#data]' + '\n' +
                              indent + indent + '[weight] ' + headerArr['pla'];
    headerArr['pro_vs_com'] = '0) ' + headerArr['pro'] + ':\n' +
                              indent + '[source:#data]' + '\n' +
                              indent + indent + '[weight] ' + headerArr['com'];
    headerArr['dis_vs_pro'] = '0) ' + headerArr['dis'] + ':\n' +
                              indent + '[source:#data]' + '\n' +
                              indent + indent + '[weight] ' + headerArr['pro'];

    return headerArr[type];
  }

  public concatProps(props, keys, showNull, hyperlinked) {
    let sep = '|';
    let str = '';

    for (let j = 0; j < props.length; j++) {
      let prop = props[j];
      let key = keys[j];

      if (!showNull && (!prop || prop === '')) {
        continue;
      }

      if (j > 0) {
        str += sep;
      }

      if (hyperlinked) {
        str += this.getHyperlinkStr(key, prop);
      } else {
        str += prop;
      }
    }

    return str;
  }

  public truncateText(text) {
    let MAX_NODE_LABEL_LEN = 32;
    let suffix = '...';

    let trunText = text.substr(0, MAX_NODE_LABEL_LEN);
    if (text.length > MAX_NODE_LABEL_LEN) {
      trunText += suffix;
    }

    return trunText;
  }

  public downloadTextOutput(type) {
    let txtArr = new Array();
    txtArr['plant_vs_compound'] = this.plaVScomTxtOutput;
    txtArr['compound_vs_protein'] = this.comVSproTxtOutput;
    txtArr['protein_vs_disease'] = this.proVSdisTxtOutput;
    txtArr['compound_vs_plant'] = this.comVSplaTxtOutput;
    txtArr['protein_vs_compound'] = this.proVScomTxtOutput;
    txtArr['disease_vs_protein'] = this.disVSproTxtOutput;
    txtArr['plant'] = this.plaMetaTxtOutput;
    txtArr['compound'] = this.comMetaTxtOutput;
    txtArr['protein'] = this.proMetaTxtOutput;
    txtArr['disease'] = this.disMetaTxtOutput;

    let suffix = '_metadata';
    if (type.indexOf('vs') !== -1) {
      suffix = '_connectivity';
    }

    let filename = 'ijah_' + type + suffix + '.txt';
    let blob = new Blob([ txtArr[type] ], {type: 'text/plain;charset=utf-8'});
    saveAs(blob, filename);
  }

  public reset() {
    this.activeTanaman = true;
    this.activeCompound = true;
    this.activeProtein = true;
    this.activeDisease = true;

    this.pTanaman = false;
    this.pCompound = false;
    this.pProtein = false;
    this.pDisease = false;

    this.plaVScomSwapped = false;
    this.comVSproSwapped = false;
    this.proVSdisSwapped = false;

    this.nPlaInputHolders = 0;
    this.nComInputHolders = 0;
    this.nProInputHolders = 0;
    this.nDisInputHolders = 0;
    this.plaInputHolders = [{ index: this.nPlaInputHolders, value : ''}];
    this.comInputHolders = [{ index: this.nComInputHolders, value : ''}];
    this.proInputHolders = [{ index: this.nProInputHolders, value : ''}];
    this.disInputHolders = [{ index: this.nDisInputHolders, value : ''}];
    this.plaInputHoldersDisabled = [];
    this.comInputHoldersDisabled = [];
    this.proInputHoldersDisabled = [];
    this.disInputHoldersDisabled = [];

    this.selectedPlants = [];
    this.selectedCompounds = [];
    this.selectedProteins = [];
    this.selectedDiseases = [];

    this.mode = 'unknown';
    this.inputType = 'unknown';
    this.elapsedTime = 0;
    this.show = false;
    this.showGraph = false;
    localStorage.clear();
    this.dataLocal = [];

    this.typeaheadNoResults = false;

    this.noResultPlant = false;
    this.noResultCompound = false;
    this.noResultProtein = false;
    this.noResultDisease = false;

    this.plaVScom_ = [];
    this.comVSpro_ = [];
    this.proVSdis_ = [];
    this.plaSet_ = [];
    this.comSet_ = [];
    this.proSet_ = [];
    this.disSet_ = [];

    this.pieChartData = [];

    this.filterThreshold = 0.0;
  }

  // BACK-BUTTON METHOD ////////////////////////////////////////////////////////
  public backButtonCallback() {
    this.show = false;
  }

  // EXAMPLE-BUTTON METHODS ////////////////////////////////////////////////////
  public exampleCallback(type) {
    this.reset();

    if (type === 'plant_vs_disease') {
      this.plaInputHolders =
          [{ index: 0, value : 'Blumea balsamifera | Sembung'},
          { index: 1, value : 'Tinospora crispa | Brotowali'},
          { index: 2, value : 'Momordica charantia | Pare'},
          { index: 3, value : 'Zingiber officinale | Jahe'},
          { index: 4, value : ''}];
      this.plaInputHoldersDisabled[0] = true;
      this.plaInputHoldersDisabled[1] = true;
      this.plaInputHoldersDisabled[2] = true;
      this.plaInputHoldersDisabled[3] = true;
      this.selectedPlants =
          [{index: 0, value: 'PLA00003831'},
          {index: 1, value: 'PLA00000683'},
          {index: 2, value: 'PLA00002036'},
          {index: 3, value: 'PLA00001034'}];
      this.nDisInputHolders = 5;

      this.disInputHolders =
          [{ index: 0, value : '601388 | Diabetes mellitus, insulin-dependent, 12'},
          { index: 1, value : '304800 | Diabetes insipidus, nephrogenic, X-linked'},
          { index: 2, value : '612227 | Diabetes mellitus, ketosis-prone'},
          { index: 3, value : ''}];
      this.disInputHoldersDisabled[0] = true;
      this.disInputHoldersDisabled[1] = true;
      this.disInputHoldersDisabled[2] = true;
      this.selectedDiseases =
          [{ index: 0, value : 'DIS00000073'},
          { index: 1, value : 'DIS00000749'},
          { index: 2, value : 'DIS00000365'}];
      this.nDisInputHolders = 4;

      this.activeCompound = false;
      this.activeProtein = false;

    } else if (type === 'plant_vs_protein') {
      this.plaInputHolders =
          [{ index: 0, value : 'Blumea balsamifera | Sembung'},
          { index: 1, value : 'Tinospora crispa | Brotowali'},
          { index: 2, value : 'Momordica charantia | Pare'},
          { index: 3, value : 'Zingiber officinale | Jahe'},
          { index: 4, value : ''}];
      this.plaInputHoldersDisabled[0] = true;
      this.plaInputHoldersDisabled[1] = true;
      this.plaInputHoldersDisabled[2] = true;
      this.plaInputHoldersDisabled[3] = true;
      this.selectedPlants =
          [{index: 0, value: 'PLA00003831'},
          {index: 1, value: 'PLA00000683'},
          {index: 2, value: 'PLA00002036'},
          {index: 3, value: 'PLA00001034'}];
      this.nDisInputHolders = 5;

      this.proInputHolders =
          [{ index: 0, value : 'P30518 | V2R_HUMAN | Vasopressin V2 receptor'},
          { index: 1, value : 'P16410 | CTLA4_HUMAN | Cytotoxic T-lymphocyte protein 4'},
          { index: 2, value : 'O43316 | PAX4_HUMAN | Paired box protein Pax-4'},
          { index: 3, value : ''}];
      this.proInputHoldersDisabled[0] = true;
      this.proInputHoldersDisabled[1] = true;
      this.proInputHoldersDisabled[2] = true;
      this.selectedProteins =
          [{ index: 0, value : 'PRO00000343'},
          { index: 1, value : 'PRO00000283'},
          { index: 2, value : 'PRO00002960'}];
      this.nProInputHolders = 4;

      this.activeDisease = false;
      this.activeCompound = false;

    } else if (type === 'compound_vs_protein') {
      this.comInputHolders =
          [{ index: 0, value : '80510-09-4 | N-cis-feruloyltyramine | (Z)-3-(4-hydroxy-3-methoxyphenyl)-N-[2-(4-hydroxyphenyl)ethyl]prop-2-enamide'},  // tslint:disable-line
          { index: 1, value : '29388-59-8 | Secoisolariciresinol | (2R,3R)-2,3-bis[(4-hydroxy-3-methoxyphenyl)methyl]butane-1,4-diol'},  // tslint:disable-line
          { index: 2, value : '18446-73-6 | Tembetarine | (1S)-1-[(3-hydroxy-4-methoxyphenyl)methyl]-6-methoxy-2,2-dimethyl-3,4-dihydro-1H-isoquinolin-2-ium-7-ol'},  // tslint:disable-line
          { index: 3, value : '644-30-4 | Curcumene | 1-methyl-4-(6-methylhept-5-en-2-yl)benzene'},  // tslint:disable-line
          { index: 4, value : ''}];
      this.comInputHoldersDisabled[0] = true;
      this.comInputHoldersDisabled[1] = true;
      this.comInputHoldersDisabled[2] = true;
      this.comInputHoldersDisabled[3] = true;
      this.selectedCompounds =
          [{ index: 0, value : 'COM00008027'},
          { index: 1, value : 'COM00021005'},
          { index: 2, value : 'COM00009696'},
          { index: 3, value : 'COM00020511'}];
      this.nComInputHolders = 5;

      this.proInputHolders =
          [{ index: 0, value : 'P53985 | Monocarboxylate transporter 1'},
          { index: 1, value : 'P20309 | Muscarinic acetylcholine receptor M3'},
          { index: 2, value : 'Q99720 | Sigma non-opioid intracellular receptor 1'},
          { index: 3, value : ''}];
      this.proInputHoldersDisabled[0] = true;
      this.proInputHoldersDisabled[1] = true;
      this.proInputHoldersDisabled[2] = true;
      this.selectedProteins =
          [{ index: 0, value : 'PRO00000040'},
          { index: 1, value : 'PRO00000452'},
          { index: 2, value : 'PRO00000377'}];
      this.nProInputHolders = 4;

      this.activeTanaman = false;
      this.activeDisease = false;

    } else if (type === 'compound_vs_disease') {
      this.comInputHolders =
          [{ index: 0, value : '80510-09-4 | N-cis-feruloyltyramine | (Z)-3-(4-hydroxy-3-methoxyphenyl)-N-[2-(4-hydroxyphenyl)ethyl]prop-2-enamide'},  // tslint:disable-line
          { index: 1, value : '29388-59-8 | Secoisolariciresinol | (2R,3R)-2,3-bis[(4-hydroxy-3-methoxyphenyl)methyl]butane-1,4-diol'},  // tslint:disable-line
          { index: 2, value : '18446-73-6 | Tembetarine | (1S)-1-[(3-hydroxy-4-methoxyphenyl)methyl]-6-methoxy-2,2-dimethyl-3,4-dihydro-1H-isoquinolin-2-ium-7-ol'},  // tslint:disable-line
          { index: 3, value : '644-30-4 | Curcumene | 1-methyl-4-(6-methylhept-5-en-2-yl)benzene'},
          { index: 4, value : ''}];
      this.comInputHoldersDisabled[0] = true;
      this.comInputHoldersDisabled[1] = true;
      this.comInputHoldersDisabled[2] = true;
      this.comInputHoldersDisabled[3] = true;
      this.selectedCompounds =
          [{ index: 1, value : 'COM00008027'},
          { index: 2, value : 'COM00021005'},
          { index: 3, value : 'COM00009696'},
          { index: 4, value : 'COM00020511'}];
      this.nComInputHolders = 5;

      this.disInputHolders =
          [{ index: 0, value : '601388 | Diabetes mellitus, insulin-dependent, 12'},
          { index: 1, value : '304800 | Diabetes insipidus, nephrogenic, X-linked'},
          { index: 2, value : '612227 | Diabetes mellitus, ketosis-prone'},
          { index: 3, value : ''}];
      this.disInputHoldersDisabled[0] = true;
      this.disInputHoldersDisabled[1] = true;
      this.disInputHoldersDisabled[2] = true;
      this.selectedDiseases =
          [{ index: 0, value : 'DIS00000073'},
          { index: 1, value : 'DIS00000749'},
          { index: 2, value : 'DIS00000365'}];
      this.nDisInputHolders = 4;

      this.activeTanaman = false;
      this.activeProtein = false;

    } else if (type === 'plant') {
      this.plaInputHolders =
          [{ index: 0, value : 'Phoenix dactylifera | Kurma'},
          { index: 1, value : 'Aloe vera | Lidah buaya'},
          { index: 2, value : 'Morinda citrifolia | Mengkudu/Pace'},
          { index: 3, value : 'Anacardium occidentale | Jambu monyet'},
          { index: 4, value : 'Cocos nucifera | Kelapa'},
          { index: 5, value : ''}];
      this.plaInputHoldersDisabled[0] = true;
      this.plaInputHoldersDisabled[1] = true;
      this.plaInputHoldersDisabled[2] = true;
      this.plaInputHoldersDisabled[3] = true;
      this.plaInputHoldersDisabled[4] = true;
      this.selectedPlants =
          [{index: 0, value: 'PLA00000007'},
          {index: 1, value: 'PLA00001504'},
          {index: 2, value: 'PLA00001838'},
          {index: 3, value: 'PLA00004093'},
          {index: 4, value: 'PLA00001600'}];
      this.nPlaInputHolders = 5;

      this.activeCompound = false;
      this.activeProtein = false;
      this.activeDisease = false;
    } else if (type === 'compound') {
      this.comInputHolders =
          [{ index: 0, value : '57-50-1 | Sucrose | (2R,3R,4S,5S,6R)-2-[(2S,3S,4S,5R)-3,4-dihydroxy-2,5-bis(hydroxymethyl)oxolan-2-yl]oxy-6-(hydroxymethyl)oxane-3,4,5-triol'},   // tslint:disable-line
          { index: 1, value : '53-16-7 | Estrone | (8R,9S,13S,14S)-3-hydroxy-13-methyl-7,8,9,11,12,14,15,16-octahydro-6H-cyclopenta[a]phenanthren-17-one'},   // tslint:disable-line
          { index: 2, value : '334-48-5 | Decanoic acid | decanoic acid'},
          { index: 3, value : '480-41-1 | Naringenin | (2S)-5,7-dihydroxy-2-(4-hydroxyphenyl)-2,3-dihydrochromen-4-one'},   // tslint:disable-line
          { index: 4, value : ''}];
      this.comInputHoldersDisabled[0] = true;
      this.comInputHoldersDisabled[1] = true;
      this.comInputHoldersDisabled[2] = true;
      this.comInputHoldersDisabled[3] = true;
      this.selectedCompounds =
          [{ index: 0, value : 'COM00004561'},
          { index: 1, value : 'COM00001997'},
          { index: 2, value : 'COM00000363'},
          { index: 3, value : 'COM00003074'}];
      this.nComInputHolders = 4;

      this.activeDisease = false;
      this.activeTanaman = false;
      this.activeProtein = false;

    } else if (type === 'protein') {
      this.proInputHolders =
          [{ index: 0, value : 'P37231 | PPARG_HUMAN | Peroxisome proliferator-activated receptor gamma'},   // tslint:disable-line
          { index: 1, value : 'P01189 | COLI_HUMAN | Pro-opiomelanocortin'},
          { index: 2, value : 'P02452 | CO1A1_HUMAN | Collagen alpha-1(I) chain'},
          { index: 3, value : 'Q9UHD2 | TBK1_HUMAN | Serine/threonine-protein kinase TBK1'},
          { index: 4, value : ''}];
      this.proInputHoldersDisabled[0] = true;
      this.proInputHoldersDisabled[1] = true;
      this.proInputHoldersDisabled[2] = true;
      this.proInputHoldersDisabled[3] = true;
      this.selectedProteins =
          [{ index: 0, value : 'PRO00002168'},
          { index: 1, value : 'PRO00000061'},
          { index: 2, value : 'PRO00000261'},
          { index: 3, value : 'PRO00001836'}];
      this.nProInputHolders = 4;

      this.activeDisease = false;
      this.activeTanaman = false;
      this.activeCompound = false;

    } else if (type === 'disease') {
      this.disInputHolders =
          [{ index: 0, value : '601665 | Obesity'},
          { index: 1, value : '600807 | Asthma'},
          { index: 2, value : '610551 | Herpes simplex encephalitis 1'},
          { index: 3, value : '156610 | Skin creases, congenital symmetric circumferential, 1'},
          { index: 4, value : '166710 | Osteoporosis'},
          { index: 5, value : ''}];
      this.disInputHoldersDisabled[0] = true;
      this.disInputHoldersDisabled[1] = true;
      this.disInputHoldersDisabled[2] = true;
      this.disInputHoldersDisabled[3] = true;
      this.disInputHoldersDisabled[4] = true;
      this.selectedDiseases =
          [{ index: 0, value : 'DIS00000470'},
          { index: 1, value : 'DIS00001061'},
          { index: 2, value : 'DIS00000900'},
          { index: 3, value : 'DIS00001455'},
          { index: 4, value : 'DIS00003892'}];
      this.nDisInputHolders = 5;

      this.activeProtein = false;
      this.activeTanaman = false;
      this.activeCompound = false;
    }
  }

  // events
  public chartClicked(e: any): void {
    console.log(e);
  }

  public chartHovered(e: any): void {
    console.log(e);
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  private typeaheadOnSelect(e: any): void {
    // Do nothing
  }

  private searchFromDrugSide(drugSideInput) {
    console.log('searchOnly: drugSideInput');
    let t0 = performance.now();

    let dsi = JSON.stringify(drugSideInput);
    // console.log(dsi);

    this.http.post(this.interactionQueryAPI, dsi).map((resp) => resp.json())
    .subscribe((plaVScom) => {
      let comSet = this.getSet(plaVScom, 'com_id');
      if (comSet.length === 0) {// input compounds may have no connectivity to plants
        for (let i = 0; i < drugSideInput.length; i++) { // tslint:disable-line
          let com = drugSideInput[i]['value'];
          comSet.push(com);
        }
      }

      let comSetJSON = this.makeJSONFormat(comSet, 'comId');
      // console.log(comSetJSON);

      this.http.post(this.interactionQueryAPI, comSetJSON).map((resp2) => resp2.json())
      .subscribe((comVSpro) => {
        let proSet = this.getSet(comVSpro, 'pro_id');
        let proSetJSON = this.makeJSONFormat(proSet, 'value');
        // console.log(proSetJSON);

        this.http.post(this.interactionQueryAPI, proSetJSON).map((resp3) => resp3.json())
        .subscribe((proVSdis) => {
          let plaSet = this.getSet(plaVScom, 'pla_id');
          let disSet = this.getSet(proVSdis, 'dis_id');

          let t1 = performance.now();
          this.elapsedTime += (t1 - t0);

          this.makeOutput(plaSet, comSet, proSet, disSet,
                          plaVScom, comVSpro, proVSdis);
          this.storeMetaAndConnectivity(plaSet, comSet, proSet, disSet,
                                        plaVScom, comVSpro, proVSdis);
        });
      });
    });
  }

  private searchFromTargetSide(targetSideInput) {
    console.log('searchOnly: targetSideInput');
    let t0 = performance.now();

    let tsi = JSON.stringify(targetSideInput);
    // console.log(tsi);

    this.http.post(this.interactionQueryAPI, tsi).map((resp) => resp.json())
    .subscribe((proVSdis) => {
      let proSet = this.getSet(proVSdis, 'pro_id');
      if (proSet.length === 0) {// input proteins may have no connectivity to diseases
        for (let i = 0; i < targetSideInput.length; i++) { // tslint:disable-line
          let pro = targetSideInput[i]['value'];
          proSet.push(pro);
        }
      }

      let proSetJSON = this.makeJSONFormat(proSet, 'proId');
      // console.log(proSetJSON);

      this.http.post(this.interactionQueryAPI, proSetJSON).map((resp2) => resp2.json())
      .subscribe((comVSpro) => {
        let comSet = this.getSet(comVSpro, 'com_id');
        let comSetJSON = this.makeJSONFormat(comSet, 'value');
        // console.log(comSetJSON);

        this.http.post(this.interactionQueryAPI, comSetJSON).map((resp3) => resp3.json())
        .subscribe((plaVScom) => {
          let plaSet = this.getSet(plaVScom, 'pla_id');
          let disSet = this.getSet(proVSdis, 'dis_id');

          let t1 = performance.now();
          this.elapsedTime += (t1 - t0);

          this.makeOutput(plaSet, comSet, proSet, disSet,
                          plaVScom, comVSpro, proVSdis);
          this.storeMetaAndConnectivity(plaSet, comSet, proSet, disSet,
                                        plaVScom, comVSpro, proVSdis);
        });
      });
    });
  }

  // OUTPUT MAKING METHODS /////////////////////////////////////////////////////
  private makeOutput(plaSet, comSet, proSet, disSet, plaVScom, comVSpro, proVSdis) {
    let t0 = performance.now();

    // Get metadata of each unique item
    let plaMetaPost = this.makeJSONFormat(plaSet, 'id');
    let comMetaPost = this.makeJSONFormat(comSet, 'id');
    let proMetaPost = this.makeJSONFormat(proSet, 'id');
    let disMetaPost = this.makeJSONFormat(disSet, 'id');

    this.http.post(this.metaQueryAPI, plaMetaPost).map((resp4) => resp4.json())
    .subscribe((plaMeta) => {
      this.http.post(this.metaQueryAPI, comMetaPost).map((resp5) => resp5.json())
      .subscribe((comMeta) => {
        this.http.post(this.metaQueryAPI, proMetaPost).map((resp6) => resp6.json())
        .subscribe((proMeta) => {
          this.http.post(this.metaQueryAPI, disMetaPost).map((resp7) => resp7.json())
          .subscribe((disMeta) => {
            // connectivity text output ////////////////////////////////////////
            this.plaVScomTxtOutput = this.makeConnectivityTextOutput(plaVScom,
                                                                     plaMeta, comMeta,
                                                                     'pla', 'com');
            this.comVSproTxtOutput = this.makeConnectivityTextOutput(comVSpro,
                                                                     comMeta, proMeta,
                                                                     'com', 'pro');
            this.proVSdisTxtOutput = this.makeConnectivityTextOutput(proVSdis,
                                                                     proMeta, disMeta,
                                                                     'pro', 'dis');
            this.comVSplaTxtOutput = this.makeConnectivityTextOutput(plaVScom,
                                                                     comMeta, plaMeta,
                                                                     'com', 'pla');
            this.proVScomTxtOutput = this.makeConnectivityTextOutput(comVSpro,
                                                                     proMeta, comMeta,
                                                                     'pro', 'com');
            this.disVSproTxtOutput = this.makeConnectivityTextOutput(proVSdis,
                                                                     disMeta, proMeta,
                                                                     'dis', 'pro');

            // connectivity graph output ///////////////////////////////////////
            let graphDataArr = [this.makeGraphDataOutput(plaVScom,
                                                         plaMeta, comMeta,
                                                         'pla', 'com',
                                                         plaSet, comSet),
                                this.makeGraphDataOutput(comVSpro,
                                                         comMeta, proMeta,
                                                         'com', 'pro',
                                                         comSet, proSet),
                                this.makeGraphDataOutput(proVSdis,
                                                         proMeta, disMeta,
                                                         'pro', 'dis',
                                                         proSet, disSet)];
            let graphData = [];
            for (let ii = 0; ii < graphDataArr.length; ii++) { // tslint:disable-line
              for (let jj = 0; jj < graphDataArr[ii].length; jj++) { // tslint:disable-line
                  let datum = graphDataArr[ii][jj];
                  graphData.push(datum);
              }
            }
            localStorage.setItem('connectivityGraphData', JSON.stringify(graphData));

            // metadata text output ////////////////////////////////////////
            this.plaMetaTxtOutput = this.makeMetaTextOutput('pla', plaSet, plaMeta);
            this.comMetaTxtOutput = this.makeMetaTextOutput('com', comSet, comMeta);
            this.proMetaTxtOutput = this.makeMetaTextOutput('pro', proSet, proMeta);
            this.disMetaTxtOutput = this.makeMetaTextOutput('dis', disSet, disMeta);

            // summary text output /////////////////////////////////////////////
            let plaComConnScore = this.getConnectivityScore(plaVScom);
            let comProConnScore = this.getConnectivityScore(comVSpro);
            let proDisConnScore = this.getConnectivityScore(proVSdis);
            let totConnScore = plaComConnScore + comProConnScore + proDisConnScore;
            let nDecimalDigits = 5;

            this.totScore = totConnScore.toFixed(3);
            this.plaComScore = plaComConnScore.toFixed(3);
            this.comProScore = comProConnScore.toFixed(3);
            this.proDisScore = proDisConnScore.toFixed(3);
            this.plaSum = plaSet.length.toString();
            this.comSum = comSet.length.toString();
            this.proSum = proSet.length.toString();
            this.disSum = disSet.length.toString();

            let nUnknownComProConn = 0;
            let nUndefinedComProConn = 0;
            let nKnownByExperimentComProConn = 0;
            let nKnownByPredictionComProConn = 0;
            let sourceSep = ' + ';
            // ^^ above: must match with the one in server_thread.py for merging prediction sources
            for (let i = 0; i < comVSpro.length; i++) { // tslint:disable-line
              let allSrc = comVSpro[i]['source'].split(sourceSep);
              let src = allSrc[0]; // TODO should depends on all sources
              if (src === 'null') {// unknown
                nUnknownComProConn += 1;
              } else if (this.comProConnExperimentSrcs.indexOf(src) !== -1) {
                nKnownByExperimentComProConn += 1;
              } else if (this.comProConnPredictionSrcs.indexOf(src) !== -1) {
                nKnownByPredictionComProConn += 1;
              } else {
                nUndefinedComProConn += 1;
              }
            }

            if (this.mode === 'search_only') {
              nUnknownComProConn = (comSet.length * proSet.length)
              - (nKnownByPredictionComProConn + nKnownByExperimentComProConn);
            }

            this.pieChartData.push(nKnownByExperimentComProConn);
            this.pieChartData.push(nKnownByPredictionComProConn);
            this.pieChartData.push(nUnknownComProConn);
            this.pieChartData.push(nUndefinedComProConn);

            this.plaMark = this.getInputMark('plant');
            this.comMark = this.getInputMark('compound');
            this.proMark = this.getInputMark('protein');
            this.disMark = this.getInputMark('disease');

            this.summaryTxtOutput = 'Minimum Connectivity Weight To Display:\n';
            this.summaryTxtOutput += '   ' + this.filterThreshold.toFixed(nDecimalDigits) + '\n';
            this.summaryTxtOutput += 'Connectivity Score:\n';
            this.summaryTxtOutput += '   Total: ' + totConnScore.toFixed(nDecimalDigits) + '\n';
            this.summaryTxtOutput += '   Plant-Compound  : ' + plaComConnScore.toString() + '\n';
            this.summaryTxtOutput += '   Compound-Protein: '
                                  + comProConnScore.toFixed(nDecimalDigits) + '\n';
            this.summaryTxtOutput += '   Protein-Disease : ' + proDisConnScore.toString() + '\n';

            this.summaryTxtOutput2 = 'Number of unique items:\n';
            this.summaryTxtOutput2 += '   #Plants   : ' + plaSet.length.toString()
                                  + this.getInputMark('plant') + '\n';
            this.summaryTxtOutput2 += '   #Compounds: ' + comSet.length.toString()
                                  + this.getInputMark('compound') + '\n';
            this.summaryTxtOutput2 += '   #Proteins : ' + proSet.length.toString()
                                  + this.getInputMark('protein') + '\n';
            this.summaryTxtOutput2 += '   #Diseases : ' + disSet.length.toString()
                                  + this.getInputMark('disease') + '\n';
            this.summaryTxtOutput2 += 'Compound-Protein Connectivity:\n';
            this.summaryTxtOutput2 += '   #known_by_experiment: '
                                  + nKnownByExperimentComProConn.toString() + '\n';
            this.summaryTxtOutput2 += '   #known_by_prediction: '
                                  + nKnownByPredictionComProConn.toString() + '\n';
            this.summaryTxtOutput2 += '   #unknown            : '
                                  + nUnknownComProConn.toString() + '\n';
            if (nUndefinedComProConn > 0) {
              this.summaryTxtOutput2 += '   #undefined            : '
                                    + nUndefinedComProConn.toString() + '\n';
            }

            let t1 = performance.now();
            this.elapsedTime += (t1 - t0);
            this.elapsedTime = this.elapsedTime / 1000.0; // from ms to s

            this.summaryTxtOutput3 = 'Mode: \n';
            this.summaryTxtOutput3 += '   ' + this.mode + '\n';
            this.summaryTxtOutput3 += 'Elapsed Time: \n';
            this.summaryTxtOutput3 += '   ' + this.elapsedTime.toFixed(nDecimalDigits)
                                  + ' seconds\n';

            // Show the output page
            this.show = true;
            this.showGraph = true;
          }); // disMeta
        }); // proMeta
      }); // comMeta
    }); // plaMeta
  }

  private makeMetaTextOutput(type, idList, meta) {
    if (idList.length === 0) {
      return 'No Metadata';
    }

    let indent = '   ';
    let txt = '';
    let keys = this.getPropKeys(type, true);
    for (let i = 0; i < idList.length; i++) {
      let props = this.getProps(idList[i], keys, meta);

      txt += (i + 1).toString() + ') ';
      for (let j = 0; j < props.length; j++) {
        let key = keys[j];
        let prop = props[j];
        if (prop) {
          prop = this.getHyperlinkStr(key, prop);
          key = key.substring(4);
          if (j > 0) {
            txt += indent;
            if ((i + 1) > 9) {txt += ' '; }
          }
          txt += key + ': ' + prop + '\n';
        }
      }
    }
    return txt;
  }

  private makeConnectivityTextOutput(interaction, srcMeta, destMeta, srcType, destType) {
    if (interaction.length === 0) {
      return 'No Connectivity';
    }

    let conn = this.groupBy(srcType, destType, interaction);

    let indent = '   ';
    let text = this.getConnHeader(srcType + '_vs_' + destType, indent) + '\n';
    let srcPropKeys = this.getPropKeys(srcType, false);
    let destPropKeys = this.getPropKeys(destType, false);

    let nUnique = 0;
    let nUniquePerConnSrc = 0;
    let pos = -1; // in which, we will insert nUniquePerConnSrc
    let prevSrc = '';
    let prevConnSource = '';

    for (let i = 0; i < conn.length; i++) { // tslint:disable-line
      for (let j = 0; j < conn[i].length; j++) { // tslint:disable-line
        let comps = conn[i][j].split('$');
        let source = comps[0];
        let weight = comps[1]; weight = parseFloat(weight).toFixed(3);
        let src = comps[2];
        let dest = comps[3];

        if (source === 'null') {
          continue;
        }

        if (prevSrc !== src) {
          nUnique = nUnique + 1;
          text = text + nUnique.toString() + ') ';

          let srcProps = this.getProps(src, srcPropKeys, srcMeta);
          text += this.concatProps(srcProps, srcPropKeys, true, true);
          text += ':\n';

          prevSrc = src;
          prevConnSource = '';
        }

        if (prevConnSource !== source) {
          if (nUniquePerConnSrc > 0) {
            text = [text.slice(0, pos), nUniquePerConnSrc.toString(), text.slice(pos)].join('');
          }

          if (nUnique > 9) {text += ' '; }
          text += indent + '[' + source + ':]\n';
          pos = text.length - 2;
          prevConnSource = source;
          nUniquePerConnSrc = 1;
        } else {
          nUniquePerConnSrc += 1;
        }

        let destProps = this.getProps(dest, destPropKeys, destMeta);
        if (nUnique > 9) {text += ' '; }
        text += indent + indent + '[' + weight + '] ';
        text += this.concatProps(destProps, destPropKeys, true, true);
        text += '\n';
      }
    }
    text = [text.slice(0, pos), nUniquePerConnSrc.toString(), text.slice(pos)].join('');

    return text;
  }

  private makeGraphDataOutput(interaction, srcMeta, destMeta, srcType, destType, srcItems, destItems) { // tslint:disable-line
    let srcPropKeys = this.getPropKeys(srcType, false);
    let destPropKeys = this.getPropKeys(destType, false);
    let data = [];

    let srcHasDestArr = [];
    let destHasSrcArr = [];
    for (let i = 0; i < srcItems.length; i++) { // tslint:disable-line
      srcHasDestArr.push(false);
    }
    for (let i = 0; i < destItems.length; i++) { // tslint:disable-line
      destHasSrcArr.push(false);
    }

    for (let i = 0; i < interaction.length; i++) { // tslint:disable-line
      let datum = [];

      let srcKey = srcType + '_id';
      let destKey = destType + '_id';

      let src = interaction[i][srcKey];
      let dest = interaction[i][destKey];

      let srcIdx = srcItems.indexOf(src);
      let destIdx = destItems.indexOf(dest);

      if ((srcIdx !== -1) && (destIdx !== -1)) {
        srcHasDestArr[srcIdx] = true;
        destHasSrcArr[destIdx] = true;

        let source = interaction[i]['source'];
        let weight = parseFloat( interaction[i]['weight'] );

        let srcProps = this.getProps(src, srcPropKeys, srcMeta);
        let destProps = this.getProps(dest, destPropKeys, destMeta);
        let srcText = this.concatProps(srcProps, srcPropKeys, false, false);
        let destText = this.concatProps(destProps, destPropKeys, false, false);

        srcText = this.truncateText(srcText);
        destText = this.truncateText(destText);

        datum.push(srcText);
        datum.push(destText);
        datum.push(weight);

        data.push(datum);
      }
    }

    // Make _dummy_ interaction (... vs anchor) to beautify the graph rendering
    let wDummy = 0.00001; // to become "invisible"
    let prefix = '';
    let srcDummyText = prefix + srcType.toUpperCase();
    let destDummyText = prefix + destType.toUpperCase();

    let anchor = [];
    anchor.push(srcDummyText);
    anchor.push(destDummyText);
    anchor.push(wDummy);
    data.push(anchor);

    for (let i = 0; i < srcHasDestArr.length; i++) {
      if (srcHasDestArr[i] === false) {
        let src = srcItems[i];
        let srcProps = this.getProps(src, srcPropKeys, srcMeta);
        let srcText = this.concatProps(srcProps, srcPropKeys, false, false);
        let destText = destDummyText;
        let w = wDummy;

        srcText = this.truncateText(srcText);
        destText = this.truncateText(destText);

        let dummy = [];
        dummy.push(srcText);
        dummy.push(destText);
        dummy.push(w);
        data.push(dummy);
      }
    }
    for (let i = 0; i < destHasSrcArr.length; i++) {
      if (destHasSrcArr[i] === false) {
        let srcText = srcDummyText;
        let dest = destItems[i];
        let destProps = this.getProps(dest, destPropKeys, destMeta);
        let destText = this.concatProps(destProps, destPropKeys, false, false);
        let w = wDummy;

        srcText = this.truncateText(srcText);
        destText = this.truncateText(destText);

        let dummy = [];
        dummy.push(srcText);
        dummy.push(destText);
        dummy.push(w);
        data.push(dummy);
      }
    }

    return data;
  }
}
