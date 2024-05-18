import { LightningElement, api, track, wire } from 'lwc';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPrioritizedAccounts from '@salesforce/apex/PriorityAccountsCustomListView.getPrioritizedAccounts';
import fetchAccIdsFrmEntrySubOb from '@salesforce/apex/PriorityAccountsCustomListView.fetchAccIdsFrmEntrySubOb';

export default class PriorityAccountsCustomListView extends LightningElement {


@track error;
@track value;
@track columns;
@track totalNumberOfRows  ;
@track loadMoreStatus;
@track targetDatatable;
@track prioritizedAccountList = [];
@track items = [];
@track relationShipFields = [];
@api searchKey = '';
@track mapFieldAPINameToFieldLabel= [];
@track isNoRecordsFound = false;
@api sortedDirection = 'asc';
@api sortedBy = 'Name';
@track offSetCount = 0;
@track isLoaded = false;
@track displayFieldValue;
@track enableInfinitLoading = true; 
@track fetchAccIdsFrmEntrySubObData = new Object(); 
@track subscriedAccountsColumnsFrom;
@track displayValue = 'Account Name';

@wire(fetchAccIdsFrmEntrySubOb)
wiredfetchAccIdsFrmEntrySubOb ({ error, data }) {   
    if (data) {
        this.fetchAccIdsFrmEntrySubObData.accountIdsList =  data.accountIdsList;
        this.fetchAccIdsFrmEntrySubObData.dynamicQueryString =  data.dynamicQueryString;
        this.subscriedAccountsColumnsFrom = data.accountMdtList;
        this.totalNumberOfRows = data.accountIdsList != null ? data.accountIdsList.length : 0;
        this.prepareDynamicColumnsForDataTable();
        this.getRecords();
    } else if (error) {
        this.error = error;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Please contact system admistrator',
                message: this.error,
                variant: 'error'
            }),
        );

    }
}
getRecords() {
   getPrioritizedAccounts({ offSetCount: this.offSetCount ,objAccIdsAndString :this.fetchAccIdsFrmEntrySubObData})
    .then(result  => { 
        if (result  != undefined && result  != null ) {       
            
            let tmpList = [];           
            let relationShipFieldsValues = this.relationShipFields;
           
            result.forEach((record) => {                
                let tmpRecord = Object.assign({}, record);              
                if(relationShipFieldsValues.length!=0){
                    for(let field of relationShipFieldsValues){

                        let arrFields = field.split(".");
                        let fieldVal;
                        let fieldValId;

                        if(arrFields.length == 2){
                            if(tmpRecord.hasOwnProperty(arrFields[0]) && tmpRecord.hasOwnProperty(arrFields[1])){

                                fieldVal = tmpRecord[arrFields[0]][arrFields[1]];
                                if(tmpRecord.hasOwnProperty(arrFields[0])){
                                    fieldValId = tmpRecord[arrFields[0]].Id;
                                }
                            }                            
                        }
                        let linkWithFieldName = 'link' + field.split(".").join("").replace ("__r", "").replace("_", "");
                        
                        if(fieldValId != undefined){
                            tmpRecord[linkWithFieldName] = '/' + fieldValId;
                        }

                        tmpRecord[field.split(".").join("").replace ("__r", "").replace("_", "")] = fieldVal;
                    }
                } 
                tmpRecord.AccountName = '/' + tmpRecord.Id;              
                tmpList.push(tmpRecord);  
            });
           
            this.prioritizedAccountList = [...this.prioritizedAccountList, ...tmpList];
            this.error = undefined;  
            this.loadMoreStatus = '';
           
            if (this.prioritizedAccountList.length >= this.totalNumberOfRows) {                  
                this.enableInfinitLoading = false;
                if (this.targetDatatable != undefined){
                    this.targetDatatable.enableInfiniteLoading = false;
                }
                this.isLoaded = true;
                this.loadMoreStatus = 'No more data to load';
                this.items = this.prioritizedAccountList;    
            }
            if (this.targetDatatable){
                this.isLoaded = true;
                this.targetDatatable.isLoading = false;
            }           
            if(this.prioritizedAccountList.length == 0){
                this.isNoRecordsFound = true;
            } 
        }else {
            this.isNoRecordsFound = true;
        }
    }).catch(error => {
        this.error = error;
        this.prioritizedAccountList = undefined;        
        this.enableInfinitLoading = false;
        this.isLoaded = true;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Something went wrong., Please contact system admistrator',
                message: this.error,
                variant: 'error'
            }),
        );
        console.log('error : ' + JSON.stringify(this.error));
    });    
} 

sortColumns( event ) {
   
    this.sortedBy = event.detail.fieldName;
    let sortedValue;    
    if(this.sortedBy == 'AccountName'){
        sortedValue = 'Name';
    }else{
        sortedValue = this.sortedBy;
    }    
    let mapVeriable = this.mapFieldAPINameToFieldLabel;
    for(let fieldValue of mapVeriable){
        if(fieldValue.key === sortedValue){
            this.displayValue = fieldValue.value;
        }
    }    
    
    this.sortedDirection = event.detail.sortDirection;
    let parseData = JSON.parse(JSON.stringify(this.prioritizedAccountList));       
    let keyValue = (a) => {
        return a[sortedValue];
    };
    let isReverse = this.sortedDirection === 'asc' ? 1: -1;
        parseData.sort((x, y) => {
        x = keyValue(x) ? keyValue(x) : ''; 
        y = keyValue(y) ? keyValue(y) : '';            
        return isReverse * ((x > y) - (y > x));
    });        
    this.prioritizedAccountList = parseData;
}    
handleKeyChange( event ) {       
    this.searchKey = event.target.value;
    var data = [];
    for(var i=0; i<this.items.length;i++){
        if(this.items[i]!= undefined && this.items[i].Name.includes(this.searchKey)){
            data.push(this.items[i]);
        }
    }
    this.prioritizedAccountList = data;    
}
handleLoadMore(event) {
    
    event.preventDefault();       
    this.offSetCount = this.offSetCount + 100;       
    event.target.isLoading = true;     
    this.targetDatatable = event.target;       
    this.loadMoreStatus = 'Loading...'; 
    this.getRecords(); 
}
prepareDynamicColumnsForDataTable(){  
        
    let subscriedAccountsColumns = [];  
    let subFields = this.subscriedAccountsColumnsFrom;     
    if(this.subscriedAccountsColumnsFrom != undefined)
    {
        subFields.forEach((record) => {
            let tmpRecord = new Object ; 
            tmpRecord.label = record.Label;
            tmpRecord.fieldName = record.Field_API_Name__c
            if(record.Field_API_Name__c.includes(".")){
                this.relationShipFields.push(record.Field_API_Name__c);
            }
            tmpRecord = this.prepareColumnsForRelFields(tmpRecord,record);
            this.mapFieldAPINameToFieldLabel.push({value:record.Label, key:tmpRecord.fieldName});
            subscriedAccountsColumns.push(tmpRecord);  
        });
     }
    this.columns = subscriedAccountsColumns; 
}
prepareColumnsForRelFields(tmpRecord,record) {

    if(record.Field_API_Name__c.includes(".")){
        if(record.Field_API_Name__c != 'RecordType.Name'){

            let modifiedFiledName = record.Field_API_Name__c.split(".").join("").replace ("__r", "").replace("_", "");
            tmpRecord.fieldName = 'link'+modifiedFiledName;
            tmpRecord.type = 'url';
            this.prepareInnerObject(tmpRecord,modifiedFiledName);

        }else{

            let modifiedFiledName = record.Field_API_Name__c.split(".").join("").replace ("__r", "").replace("_", "");
            tmpRecord.fieldName = modifiedFiledName;
            tmpRecord.type = 'text'; 
        }
    }
    if(!record.Field_API_Name__c.includes(".")){
        if(record.Field_API_Name__c == 'Name'){

            tmpRecord.fieldName = 'AccountName';
            tmpRecord.type = 'url';
            this.prepareInnerObject(tmpRecord,record.Field_API_Name__c); 

        }else{

            tmpRecord.type =  'text';
        }
    }              
    tmpRecord.sortable = true;    
    return tmpRecord;
}

prepareInnerObject(tmpRecord,modifiedFiledName){

    let urlObject = new Object();
    let urlObjectInner = new Object();
    urlObjectInner.fieldName = modifiedFiledName;
    urlObjectInner.target = '_blank';                   
    urlObject.label = urlObjectInner;
    tmpRecord.typeAttributes = urlObject;
}

close(){
    setTimeout(
        function() {
            window.history.back();
        },
        1000
    );
}

}